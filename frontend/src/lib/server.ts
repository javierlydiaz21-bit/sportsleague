import { ApiError, request } from './api';

/**
 * Lectura desde componentes de servidor (SSR para SEO de resultados y tablas).
 * Devuelve null si el recurso no existe.
 */
export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Igual que serverGet pero tolera fallos (útil para secciones opcionales de una página). */
export async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return (await request<T>(path)) ?? fallback;
  } catch {
    return fallback;
  }
}
