import { isBlocked, isPublicWrite, rateTier, requiresAdmin, resolveService } from './routes';

describe('tabla de enrutamiento del gateway', () => {
  it.each([
    ['/api/v1/auth/login', 'auth'],
    ['/api/v1/users/123', 'auth'],
    ['/api/v1/leagues', 'league'],
    ['/api/v1/categories/1/rules', 'league'],
    ['/api/v1/teams/1/players', 'team'],
    ['/api/v1/players/1/eligibility', 'team'],
    ['/api/v1/players/1/disciplinary-record', 'statistics'],
    ['/api/v1/seasons/1/fixtures/generate', 'fixture'],
    ['/api/v1/seasons/1', 'league'],
    ['/api/v1/matches/1', 'fixture'],
    ['/api/v1/matches/1/venue', 'fixture'],
    ['/api/v1/matches/1/events', 'live-score'],
    ['/api/v1/matches/1/live', 'live-score'],
    ['/api/v1/matches/1/complete', 'live-score'],
    ['/api/v1/live/matches', 'live-score'],
    ['/api/v1/standings/1', 'statistics'],
    ['/api/v1/referees', 'referee'],
    ['/api/v1/assignments/mine', 'referee'],
    ['/api/v1/notifications', 'notification'],
    ['/api/v1/subscriptions', 'notification'],
    ['/api/v1/analytics/overview', 'analytics'],
  ])('%s → %s', (path, service) => {
    expect(resolveService(path)).toBe(service);
  });

  it('no enruta rutas desconocidas ni las del propio gateway', () => {
    expect(resolveService('/api/v1/system/health')).toBeUndefined();
    expect(resolveService('/api/v1/leaguesx')).toBeUndefined();
  });

  it('bloquea los endpoints internos entre servicios', () => {
    expect(isBlocked('/api/v1/internal/seasons/1/structure')).toBe(true);
    expect(isBlocked('/api/v1/leagues')).toBe(false);
  });

  it('identifica las rutas exclusivas del administrador', () => {
    expect(requiresAdmin('GET', '/api/v1/users')).toBe(true);
    expect(requiresAdmin('PATCH', '/api/v1/leagues/1/review')).toBe(true);
    expect(requiresAdmin('PATCH', '/api/v1/leagues/1')).toBe(false);
    expect(requiresAdmin('GET', '/api/v1/system/health')).toBe(true);
  });

  it('clasifica el nivel de rate limiting', () => {
    expect(isPublicWrite('POST', '/api/v1/auth/login')).toBe(true);
    expect(rateTier('POST', '/api/v1/auth/login')).toBe('auth');
    expect(rateTier('POST', '/api/v1/matches/1/events')).toBe('write');
    expect(rateTier('GET', '/api/v1/standings/1')).toBe('read');
  });
});
