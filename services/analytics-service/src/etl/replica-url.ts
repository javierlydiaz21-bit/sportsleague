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

const READ_ONLY_OPTION = '-c default_transaction_read_only=on';

/**
 * Abre la conexión en modo de solo lectura: agrega `-c default_transaction_read_only=on` a las
 * opciones de la URL, sin perder las que ya trae (p. ej. search_path), y así cualquier escritura falla.
 * Es una opción de la sesión, no un usuario con permisos restringidos: en Render Free el ETL usa el
 * usuario de la instancia, que sí podría desactivarla.
 */
export function withReadOnlyTransactions(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const parsed = new URL(url);
  const options = parsed.searchParams.get('options') ?? '';
  if (options.includes('default_transaction_read_only')) return url;
  parsed.searchParams.set('options', options ? `${options} ${READ_ONLY_OPTION}` : READ_ONLY_OPTION);
  return parsed.toString();
}
