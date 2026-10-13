import { randomToken, readCookie, sha256, signAccessToken, verifyAccessToken } from './tokens';

describe('tokens', () => {
  const user = { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', email: 'ana@liga.com', name: 'Ana', role: 'ORGANIZER' as const };

  it('firma un access token verificable con los claims del usuario', () => {
    const token = signAccessToken(user, 'secret', 60);
    const payload = verifyAccessToken(token, 'secret');
    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe('ORGANIZER');
    expect(payload.email).toBe('ana@liga.com');
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = signAccessToken(user, 'secret', 60);
    expect(() => verifyAccessToken(token, 'otro-secreto')).toThrow();
  });

  it('genera tokens aleatorios distintos y hashes deterministas', () => {
    expect(randomToken()).not.toEqual(randomToken());
    expect(sha256('abc')).toEqual(sha256('abc'));
    expect(sha256('abc')).toHaveLength(64);
  });

  it('lee cookies de la cabecera', () => {
    expect(readCookie('a=1; sl_refresh=xyz%3D; b=2', 'sl_refresh')).toBe('xyz=');
    expect(readCookie(undefined, 'sl_refresh')).toBeUndefined();
  });
});
