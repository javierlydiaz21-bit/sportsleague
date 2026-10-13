import { BadGatewayException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { AuthUser } from './auth-context';
import { log } from './logger';
import { circuitBreakerState, upstreamRequestsTotal } from './metrics';
import { currentContext } from './request-context';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker: tras N fallos consecutivos el circuito se abre y las
 * llamadas se rechazan de inmediato. Pasado el enfriamiento se permite una
 * llamada de prueba (semiabierto); si responde bien, el circuito se cierra.
 */
export class CircuitBreaker {
  state: CircuitState = 'CLOSED';
  private failures = 0;
  private openedAt = 0;

  constructor(
    readonly name: string,
    private readonly threshold = 5,
    private readonly cooldownMs = 15_000,
    private readonly now: () => number = () => Date.now(),
  ) {
    circuitBreakerState.set({ target: name }, 0);
  }

  allowRequest(): boolean {
    if (this.state === 'OPEN') {
      if (this.now() - this.openedAt >= this.cooldownMs) {
        this.transition('HALF_OPEN');
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    if (this.state !== 'CLOSED') this.transition('CLOSED');
  }

  onFailure(): void {
    this.failures += 1;
    if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
      this.openedAt = this.now();
      this.transition('OPEN');
    }
  }

  snapshot() {
    return {
      target: this.name,
      state: this.state,
      consecutiveFailures: this.failures,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
    };
  }

  private transition(next: CircuitState): void {
    if (next !== this.state) {
      log.warn('circuit_breaker_transition', { target: this.name, from: this.state, to: next });
    }
    this.state = next;
    circuitBreakerState.set({ target: this.name }, next === 'CLOSED' ? 0 : next === 'HALF_OPEN' ? 1 : 2);
  }
}

/** Registro de circuit breakers del servicio (se expone en GET /status). */
export const breakers = new Map<string, CircuitBreaker>();

export interface ServiceClientOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  failureThreshold?: number;
  cooldownMs?: number;
}

export interface UpstreamRequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Usuario en nombre del cual se hace la llamada (se propaga en cabeceras x-user-*). */
  user?: AuthUser;
  retries?: number;
}

class RetriableError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cliente REST resiliente para la comunicación síncrona entre microservicios:
 * timeout por llamada, reintentos con backoff exponencial (solo lecturas) y
 * circuit breaker para evitar fallos en cascada.
 */
export class ServiceClient {
  readonly breaker: CircuitBreaker;
  private readonly baseUrl: string;

  constructor(
    readonly name: string,
    baseUrl: string,
    private readonly options: ServiceClientOptions = {},
  ) {
    // Acepta "http://host:puerto" o solo "host:puerto" (formato de la red privada de Render).
    this.baseUrl = baseUrl.includes('://') ? baseUrl : `http://${baseUrl}`;
    this.breaker = new CircuitBreaker(name, options.failureThreshold ?? 5, options.cooldownMs ?? 15_000);
    breakers.set(name, this.breaker);
  }

  get<T>(path: string, options?: UpstreamRequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options?: UpstreamRequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  async request<T>(method: string, path: string, options: UpstreamRequestOptions = {}): Promise<T> {
    if (!this.breaker.allowRequest()) {
      upstreamRequestsTotal.inc({ target: this.name, outcome: 'short_circuit' });
      throw new ServiceUnavailableException(
        `El servicio ${this.name} no está disponible en este momento (circuito abierto). Intenta de nuevo en unos segundos.`,
      );
    }
    const defaultRetries = method === 'GET' ? (this.options.retries ?? 2) : 0;
    const attempts = 1 + (options.retries ?? defaultRetries);
    const backoff = this.options.backoffMs ?? 150;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await this.once<T>(method, path, options);
        this.breaker.onSuccess();
        upstreamRequestsTotal.inc({ target: this.name, outcome: 'ok' });
        return result;
      } catch (err) {
        if (err instanceof HttpException) {
          // El servicio respondió (4xx): no cuenta como fallo de disponibilidad.
          this.breaker.onSuccess();
          upstreamRequestsTotal.inc({ target: this.name, outcome: 'client_error' });
          throw err;
        }
        lastError = err;
        if (attempt < attempts) await sleep(backoff * 2 ** (attempt - 1) + Math.random() * 50);
      }
    }

    this.breaker.onFailure();
    upstreamRequestsTotal.inc({ target: this.name, outcome: 'error' });
    log.warn('upstream_request_failed', {
      target: this.name,
      method,
      path,
      attempts,
      error: (lastError as Error)?.message,
    });
    throw new ServiceUnavailableException(`El servicio ${this.name} no respondió a tiempo. Intenta de nuevo.`);
  }

  private async once<T>(method: string, path: string, options: UpstreamRequestOptions): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {
      accept: 'application/json',
      'x-internal-token': process.env.INTERNAL_API_TOKEN ?? '',
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const ctx = currentContext();
    if (ctx?.requestId) headers['x-request-id'] = ctx.requestId;
    if (options.user) {
      headers['x-user-id'] = options.user.id;
      headers['x-user-role'] = options.user.role;
      headers['x-user-email'] = options.user.email;
      headers['x-user-name'] = encodeURIComponent(options.user.name);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 3000);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }
      if (res.status >= 500) throw new RetriableError(`HTTP ${res.status}`);
      if (res.status === 401) throw new BadGatewayException(`Error de autenticación interna con ${this.name}`);
      if (res.status >= 400) {
        const body = typeof data === 'object' && data ? (data as Record<string, unknown>) : { message: text };
        throw new HttpException({ statusCode: res.status, ...body }, res.status);
      }
      return data as T;
    } catch (err) {
      if (err instanceof HttpException || err instanceof RetriableError) throw err;
      throw new RetriableError((err as Error).name === 'AbortError' ? 'timeout' : (err as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }
}
