/** URL pública del API Gateway (navegador). */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
/** Canal WebSocket del Live Score Service. */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4006';
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? 'America/Bogota';
export const UTC_OFFSET = process.env.NEXT_PUBLIC_UTC_OFFSET ?? '-05:00';

/** En el servidor (SSR) se usa la URL interna de la red de Docker. */
export function apiBase(): string {
  if (typeof window === 'undefined') return process.env.API_INTERNAL_URL ?? PUBLIC_API_URL;
  return PUBLIC_API_URL;
}
