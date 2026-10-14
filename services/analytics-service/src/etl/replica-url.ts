/**
 * URL de una réplica de solo lectura. Acepta una URL completa o solo el nombre de la base:
 * en ese caso se usa la misma instancia que DATABASE_URL (render-free.yaml, donde una única
 * PostgreSQL gratuita aloja una base por servicio).
 */
export function resolveReplicaUrl(value: string | undefined, databaseUrl: string | undefined): string | undefined {
  if (!value || value.includes('://')) return value || undefined;
  if (!databaseUrl) return undefined;
  const instance = databaseUrl.slice(0, databaseUrl.lastIndexOf('/'));
  return `${instance}/${value}`;
}
