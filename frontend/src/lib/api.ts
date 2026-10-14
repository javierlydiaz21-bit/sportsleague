import { PUBLIC_API_URL, apiBase } from './config';
import { errorMessage } from './format';

/** Mensaje cuando un servicio no responde (en Render Free, normalmente porque se está despertando). */
export const SERVICE_WAKING_MESSAGE =
  'El servidor no responde en este momento. Si la plataforma estuvo inactiva, tarda hasta un minuto en despertar: inténtalo de nuevo.';

/** 502/503/504: el gateway o un servicio no respondió a tiempo. */
export const isUnavailableStatus = (status: number) => status === 502 || status === 503 || status === 504;

/** Avisa al gateway de que alguien usa la web: en Render Free despierta a los servicios dormidos. */
export function wakeServices(): void {
  void fetch(`${PUBLIC_API_URL}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: string;
  json?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/** Todas las solicitudes HTTP pasan por el API Gateway (/api/v1). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
      cache: 'no-store',
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica que la plataforma esté en ejecución.');
  }
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    if (isUnavailableStatus(res.status)) throw new ApiError(res.status, SERVICE_WAKING_MESSAGE, undefined, data);
    const code = data && typeof data === 'object' && 'code' in data ? String((data as { code: unknown }).code) : undefined;
    throw new ApiError(res.status, errorMessage(data ?? { message: res.statusText }), code, data);
  }
  return data as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : '';
}
