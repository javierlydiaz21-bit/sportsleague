import { apiBase } from './config';
import { errorMessage } from './format';

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
