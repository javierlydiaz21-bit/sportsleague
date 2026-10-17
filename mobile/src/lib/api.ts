import { API_URL, HEALTH_URL } from './config';
import { errorMessage } from './format';

/** Render Free duerme los servicios sin tráfico: tardan 30–60 s en despertar. */
export const WAKING_MESSAGE = 'Los servicios se están despertando, espera unos segundos…';

/** Más que el PROXY_TIMEOUT_MS del gateway (60 s), que espera a los servicios que se despiertan. */
const REQUEST_TIMEOUT_MS = 75_000;

/** 502/503/504: el gateway o un servicio no respondió a tiempo. */
export const isWakingStatus = (status: number) => status === 502 || status === 503 || status === 504;

export class ApiError extends Error {
  /** Error de red o 502/503/504: casi siempre, servicios dormidos que se están despertando. */
  readonly waking: boolean;

  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.waking = status === 0 || isWakingStatus(status);
  }
}

/** Comprobación sin instanceof (más robusta al transpilar clases que heredan de Error). */
export function isApiError(err: unknown): err is ApiError {
  return !!err && typeof err === 'object' && (err as { name?: unknown }).name === 'ApiError';
}

export function toApiError(err: unknown): ApiError {
  return isApiError(err) ? err : new ApiError(-1, errorMessage(err));
}

export interface RequestOptions {
  method?: string;
  json?: unknown;
  token?: string | null;
}

/** Todas las solicitudes HTTP pasan por el API Gateway (/api/v1), igual que en la web. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let status: number;
  let text: string;
  try {
    // Sin la opción `cache`: el polyfill de fetch de React Native añadiría un parámetro "_" a la URL
    // y los servicios rechazan los parámetros de consulta desconocidos.
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
      signal: controller.signal,
    });
    status = res.status;
    text = await res.text();
  } catch {
    throw new ApiError(0, WAKING_MESSAGE);
  } finally {
    clearTimeout(timer);
  }

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (status < 200 || status >= 300) {
    // Render responde 502 con una página HTML mientras el servicio arranca.
    if (isWakingStatus(status)) throw new ApiError(status, WAKING_MESSAGE);
    const body = data && typeof data === 'object' ? (data as { code?: unknown }) : undefined;
    const code = body?.code !== undefined ? String(body.code) : undefined;
    throw new ApiError(status, errorMessage(body ?? { message: `Error ${status}` }), code);
  }
  return data as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Avisa al gateway de que alguien usa la app: en Render Free despierta a los servicios dormidos. */
export function wakeServices(): void {
  void fetch(HEALTH_URL, { mode: 'no-cors' }).catch(() => undefined);
}
