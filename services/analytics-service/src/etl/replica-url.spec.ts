import { resolveReplicaUrl, withReadOnlyTransactions } from './replica-url';

describe('URL de las réplicas de solo lectura', () => {
  const primary = 'postgresql://user:secret@dpg-abc-a/analytics_db?connection_limit=5';

  it('respeta una URL completa', () => {
    const full = 'postgresql://analytics_ro:ro@replica:5432/fixture_db';
    expect(resolveReplicaUrl(full, primary)).toBe(full);
  });

  it('con solo el nombre de la base usa la misma instancia que DATABASE_URL', () => {
    expect(resolveReplicaUrl('fixture_db', primary)).toBe('postgresql://user:secret@dpg-abc-a/fixture_db');
  });

  it('sin valor no configura la réplica', () => {
    expect(resolveReplicaUrl(undefined, primary)).toBeUndefined();
    expect(resolveReplicaUrl('', primary)).toBeUndefined();
    expect(resolveReplicaUrl('fixture_db', undefined)).toBeUndefined();
  });
});

describe('conexión en modo de solo lectura', () => {
  const options = (url: string | undefined) => new URL(url as string).searchParams.get('options');

  it('agrega default_transaction_read_only=on a la URL', () => {
    const url = withReadOnlyTransactions('postgresql://user:secret@dpg-abc-a/fixture_db');
    expect(options(url)).toBe('-c default_transaction_read_only=on');
    expect(url).toContain('postgresql://user:secret@dpg-abc-a/fixture_db?');
  });

  it('conserva las opciones que ya trae la URL (p. ej. search_path)', () => {
    const url = withReadOnlyTransactions(`postgresql://u:p@db/fixture_db?options=${encodeURIComponent('-c search_path=pruebas')}`);
    expect(options(url)).toBe('-c search_path=pruebas -c default_transaction_read_only=on');
  });

  it('no repite la opción si la URL ya la trae, y sin URL no hace nada', () => {
    const already = `postgresql://u:p@db/fixture_db?options=${encodeURIComponent('-c default_transaction_read_only=on')}`;
    expect(withReadOnlyTransactions(already)).toBe(already);
    expect(withReadOnlyTransactions(undefined)).toBeUndefined();
  });
});
