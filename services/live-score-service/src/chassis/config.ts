/**
 * Microservice chassis: configuración básica del servicio.
 *
 * Cada microservicio lleva su PROPIA copia de esta carpeta (src/chassis).
 * No es una librería compartida en tiempo de ejecución: así cada servicio se
 * construye, prueba y despliega de forma totalmente independiente.
 */
export interface ServiceInfo {
  name: string;
  version: string;
  startedAt: Date;
}

export const serviceInfo: ServiceInfo = {
  name: process.env.SERVICE_NAME ?? 'service',
  version: process.env.SERVICE_VERSION ?? '1.0.0',
  startedAt: new Date(),
};

export function configureService(name: string): void {
  serviceInfo.name = process.env.SERVICE_NAME ?? name;
}

export function env(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Falta la variable de entorno obligatoria ${key}`);
}

export function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function envList(key: string, fallback: string[] = []): string[] {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
