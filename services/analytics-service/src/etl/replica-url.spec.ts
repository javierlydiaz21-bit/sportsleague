import { resolveReplicaUrl } from './replica-url';

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
