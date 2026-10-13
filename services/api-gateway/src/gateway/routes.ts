/** Tabla de enrutamiento del API Gateway (el orden importa: gana la primera coincidencia). */

export type ServiceName =
  | 'auth'
  | 'league'
  | 'team'
  | 'fixture'
  | 'referee'
  | 'live-score'
  | 'statistics'
  | 'notification'
  | 'analytics';

export const SERVICES: Record<ServiceName, { env: string; fallback: string; label: string }> = {
  auth: { env: 'AUTH_SERVICE_URL', fallback: 'http://localhost:4001', label: 'Auth Service' },
  league: { env: 'LEAGUE_SERVICE_URL', fallback: 'http://localhost:4002', label: 'League Service' },
  team: { env: 'TEAM_SERVICE_URL', fallback: 'http://localhost:4003', label: 'Team Service' },
  fixture: { env: 'FIXTURE_SERVICE_URL', fallback: 'http://localhost:4004', label: 'Fixture Service' },
  referee: { env: 'REFEREE_SERVICE_URL', fallback: 'http://localhost:4005', label: 'Referee Service' },
  'live-score': { env: 'LIVE_SCORE_SERVICE_URL', fallback: 'http://localhost:4006', label: 'Live Score Service' },
  statistics: { env: 'STATISTICS_SERVICE_URL', fallback: 'http://localhost:4007', label: 'Statistics Service' },
  notification: { env: 'NOTIFICATION_SERVICE_URL', fallback: 'http://localhost:4008', label: 'Notification Service' },
  analytics: { env: 'ANALYTICS_SERVICE_URL', fallback: 'http://localhost:4009', label: 'Analytics Service' },
};

export function serviceUrls(): Record<ServiceName, string> {
  return Object.fromEntries(
    Object.entries(SERVICES).map(([name, cfg]) => {
      const value = process.env[cfg.env] || cfg.fallback;
      // Acepta "http://host:puerto" o solo "host:puerto" (formato de la red privada de Render).
      return [name, value.includes('://') ? value : `http://${value}`];
    }),
  ) as Record<ServiceName, string>;
}

const ROUTES: { service: ServiceName; pattern: RegExp }[] = [
  { service: 'auth', pattern: /^\/api\/v1\/(auth|users)(\/|$)/ },
  { service: 'live-score', pattern: /^\/api\/v1\/matches\/[^/]+\/(events|live|start|complete)(\/|$)/ },
  { service: 'live-score', pattern: /^\/api\/v1\/live(\/|$)/ },
  { service: 'fixture', pattern: /^\/api\/v1\/seasons\/[^/]+\/fixtures(\/|$)/ },
  { service: 'fixture', pattern: /^\/api\/v1\/(fixtures|matches)(\/|$)/ },
  { service: 'statistics', pattern: /^\/api\/v1\/players\/[^/]+\/disciplinary-record(\/|$)/ },
  { service: 'statistics', pattern: /^\/api\/v1\/(standings|top-scorers|disciplinary|statistics)(\/|$)/ },
  { service: 'team', pattern: /^\/api\/v1\/(teams|players)(\/|$)/ },
  { service: 'league', pattern: /^\/api\/v1\/(leagues|seasons|categories|venues)(\/|$)/ },
  { service: 'referee', pattern: /^\/api\/v1\/(referees|assignments)(\/|$)/ },
  { service: 'notification', pattern: /^\/api\/v1\/(notifications|subscriptions)(\/|$)/ },
  { service: 'analytics', pattern: /^\/api\/v1\/analytics(\/|$)/ },
];

export function resolveService(path: string): ServiceName | undefined {
  return ROUTES.find((route) => route.pattern.test(path))?.service;
}

/** Los endpoints /internal solo se usan entre microservicios: nunca se exponen a clientes. */
export function isBlocked(path: string): boolean {
  return /^\/api\/v1\/internal(\/|$)/.test(path);
}

/** Escrituras permitidas sin sesión (las propias del inicio de sesión). */
export function isPublicWrite(method: string, path: string): boolean {
  return method === 'POST' && /^\/api\/v1\/auth\/(login|register|refresh|logout)$/.test(path);
}

const ADMIN_ONLY: { method?: string; pattern: RegExp }[] = [
  { pattern: /^\/api\/v1\/users(\/|$)/ },
  { pattern: /^\/api\/v1\/system(\/|$)/ },
  { pattern: /^\/status$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/leagues\/[^/]+\/review$/ },
  { method: 'GET', pattern: /^\/api\/v1\/leagues\/stats$/ },
  { pattern: /^\/api\/v1\/analytics\/(overview|etl)(\/|$)/ },
  { pattern: /^\/api\/v1\/notifications\/deliveries(\/|$)/ },
];

/** Defensa en profundidad: el gateway bloquea estas rutas aunque el servicio también lo valide. */
export function requiresAdmin(method: string, path: string): boolean {
  return ADMIN_ONLY.some((rule) => (!rule.method || rule.method === method) && rule.pattern.test(path));
}

export type RateTier = 'auth' | 'write' | 'read';

export function rateTier(method: string, path: string): RateTier {
  if (isPublicWrite(method, path) && !path.endsWith('/logout')) return 'auth';
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
}

/** Canales de eventos de dominio que el panel de administración monitorea. */
export const EVENT_CHANNELS = [
  'user.registered',
  'user.updated',
  'league.created',
  'league.reviewed',
  'rules.updated',
  'fixture.published',
  'match.rescheduled',
  'match.suspended',
  'referee.assigned',
  'referee.unassigned',
  'match.started',
  'match.event',
  'match.event.deleted',
  'match.completed',
  'standings.updated',
];
