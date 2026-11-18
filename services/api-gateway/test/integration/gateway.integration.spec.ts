/**
 * Prueba de integración del API Gateway: la aplicación completa tal como arranca en producción
 * (configureApp + configureGateway: métricas, cabeceras de seguridad, CORS, JWT, rate limiting y proxy)
 * frente a microservicios por HTTP.
 *
 * El gateway no tiene base de datos propia. Simulado:
 * - Los microservicios: un servidor HTTP local por servicio que devuelve lo que recibió (ruta, cabeceras
 *   y cuerpo) y responde /status. Analytics queda apagado a propósito para probar el 503.
 * - Redis: un contador en memoria con la misma interfaz (rate limiting y lista de suspendidos).
 */
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sign } from 'jsonwebtoken';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EventBus, InMemoryEventBus, RedisService, configureApp, setupOpenApi } from '../../src/chassis';
import { GATEWAY_OPENAPI, configureGateway } from '../../src/gateway/setup';
import { SERVICES, type ServiceName } from '../../src/gateway/routes';
import { INTERNAL_TOKEN } from '../test-utils';

const JWT_SECRET = 'secreto-jwt-de-prueba';
const WEB_ORIGIN = 'https://web.ejemplo.test';
const ORGANIZER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const FAN_ID = '60000000-0000-4000-8000-000000000001';
const ADMIN_ID = '60000000-0000-4000-8000-000000000009';
const SEASON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MATCH_ID = '30000000-0000-4000-8000-000000000001';
const TEAM_ID = '10000000-0000-4000-8000-000000000001';

/** JWT con el mismo formato que emite Auth Service. */
function bearer(id: string, role: string, options: { secret?: string; expired?: boolean } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const token = sign(
    { email: `${role.toLowerCase()}@ejemplo.test`, name: role === 'ORGANIZER' ? 'Ana Pérez' : 'Usuario de prueba', role, sub: id, iat: now, exp: options.expired ? now - 60 : now + 300 },
    options.secret ?? JWT_SECRET,
    { issuer: 'sportsleague-auth', audience: 'sportsleague' },
  );
  return { authorization: `Bearer ${token}` };
}
const ORGANIZER = bearer(ORGANIZER_ID, 'ORGANIZER');
const FAN = bearer(FAN_ID, 'FAN');
const ADMIN = bearer(ADMIN_ID, 'ADMIN');

interface Received {
  service: ServiceName;
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: string;
}

/** Microservicio simulado: responde /status y, para el resto, devuelve lo que recibió. */
function fakeService(name: ServiceName) {
  const calls: Received[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      if (req.url === '/status') return res.end(JSON.stringify({ status: 'up', version: '1.0.0' }));
      const received = { service: name, method: req.method ?? '', path: req.url ?? '', headers: req.headers, body };
      calls.push(received);
      res.end(JSON.stringify(received));
    });
  });
  return { server, calls };
}

/** Redis en memoria con lo que usa el gateway: get/set, multi().incr().expire().exec(), ping y pubsub. */
function fakeRedis() {
  const store = new Map<string, string>();
  const known: Record<string, unknown> = {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => (store.set(key, String(value)), 'OK'),
    del: async (key: string) => Number(store.delete(key)),
    multi: () => {
      const keys: string[] = [];
      const chain = {
        incr: (key: string) => (keys.push(key), chain),
        expire: () => chain,
        exec: async () =>
          keys.map((key) => {
            const next = Number(store.get(key) ?? 0) + 1;
            store.set(key, String(next));
            return [null, next];
          }),
      };
      return chain;
    },
    pubsub: async (_command: string, ...channels: string[]) => channels.flatMap((channel) => [channel, 1]),
  };
  const client: any = new Proxy(known, {
    get: (target, prop: string) => (prop in target ? target[prop] : prop === 'then' ? undefined : async () => null),
  });
  return { store, service: { client, create: () => client, ping: async () => 'PONG', onModuleDestroy: async () => undefined } };
}

const listen = (server: Server) => new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));
const close = (server: Server) => new Promise((resolve) => (server.closeAllConnections(), server.close(resolve)));

describe('API Gateway · integración (cadena completa frente a los microservicios)', () => {
  const services = new Map<ServiceName, ReturnType<typeof fakeService>>();
  const redis = fakeRedis();
  let app: NestExpressApplication;

  beforeAll(async () => {
    for (const name of Object.keys(SERVICES) as ServiceName[]) {
      if (name === 'analytics') continue;
      const fake = fakeService(name);
      services.set(name, fake);
      process.env[SERVICES[name].env] = `http://127.0.0.1:${await listen(fake.server)}`;
    }
    // Analytics apagado: un puerto que estuvo abierto y ya no escucha.
    const off = createServer();
    process.env.ANALYTICS_SERVICE_URL = `http://127.0.0.1:${await listen(off)}`;
    await close(off);

    Object.assign(process.env, {
      JWT_SECRET,
      CORS_ORIGINS: WEB_ORIGIN,
      RATE_LIMIT_AUTH: '3', // tres intentos de inicio de sesión por ventana
      RATE_LIMIT_WINDOW_SECONDS: '3600',
      PROXY_TIMEOUT_MS: '3000',
      WAKE_SERVICES: 'false',
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue(redis.service)
      .overrideProvider(EventBus)
      .useValue(new InMemoryEventBus())
      .compile();
    // Igual que bootstrapService en main.ts: configureApp con las opciones del gateway, configureGateway y /docs.
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false, bodyParser: false });
    configureApp(app, { bodyParser: false, routeFromPath: true });
    configureGateway(app);
    setupOpenApi(app, { name: 'api-gateway', version: '1.0.0', ...GATEWAY_OPENAPI });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([...services.values()].map((fake) => close(fake.server)));
  });

  const http = () => request(app.getHttpServer());

  it('enruta cada lectura pública a su microservicio con el token interno y el mismo x-request-id', async () => {
    const routes: [string, ServiceName][] = [
      ['/api/v1/leagues', 'league'],
      [`/api/v1/standings/${SEASON_ID}`, 'statistics'],
      [`/api/v1/matches/${MATCH_ID}/live`, 'live-score'],
      [`/api/v1/matches/${MATCH_ID}`, 'fixture'],
      [`/api/v1/teams/${TEAM_ID}/players`, 'team'],
    ];
    for (const [path, service] of routes) {
      const res = await http().get(path).expect(200);
      expect(res.body).toMatchObject({ service, method: 'GET', path });
      expect(res.body.headers['x-internal-token']).toBe(INTERNAL_TOKEN);
      expect(res.body.headers['x-user-id']).toBeUndefined();
      expect(res.body.headers['x-request-id']).toBe(res.headers['x-request-id']);
    }
  });

  it('con un JWT válido propaga la identidad y reenvía el cuerpo intacto; sin sesión responde 401 sin llegar al servicio', async () => {
    const league = { name: 'Liga Universitaria', sport: 'FOOTBALL', city: 'Montería' };
    const res = await http().post('/api/v1/leagues').set(ORGANIZER).send(league).expect(200);
    expect(res.body.headers).toMatchObject({
      'x-user-id': ORGANIZER_ID,
      'x-user-role': 'ORGANIZER',
      'x-user-email': 'organizer@ejemplo.test',
      'x-user-name': encodeURIComponent('Ana Pérez'),
      'x-internal-token': INTERNAL_TOKEN,
    });
    expect(JSON.parse(res.body.body)).toEqual(league);

    const before = services.get('league')!.calls.length;
    const anonymous = await http().post('/api/v1/leagues').send(league).expect(401);
    expect(anonymous.body.message).toBe('Debes iniciar sesión');
    expect(services.get('league')!.calls).toHaveLength(before);
  });

  it('descarta las cabeceras de identidad que manda el cliente y rechaza tokens falsificados o vencidos', async () => {
    const spoofed = await http()
      .get('/api/v1/leagues')
      .set({ 'x-user-id': ADMIN_ID, 'x-user-role': 'ADMIN', 'x-internal-token': 'token-robado' })
      .expect(200);
    expect(spoofed.body.headers['x-user-id']).toBeUndefined();
    expect(spoofed.body.headers['x-user-role']).toBeUndefined();
    expect(spoofed.body.headers['x-internal-token']).toBe(INTERNAL_TOKEN);

    const forged = await http().get('/api/v1/leagues').set(bearer(ADMIN_ID, 'ADMIN', { secret: 'otro-secreto' })).expect(401);
    expect(forged.body.code).toBe('TOKEN_INVALID');
    const expired = await http().get('/api/v1/leagues').set(bearer(FAN_ID, 'FAN', { expired: true })).expect(401);
    expect(expired.body.code).toBe('TOKEN_EXPIRED');
  });

  it('bloquea rutas internas (404), las de administración a quien no es ADMIN (403) y a un usuario suspendido (403)', async () => {
    await http().get(`/api/v1/internal/assignments/check?matchId=${MATCH_ID}&email=a@ejemplo.test`).expect(404);
    await http().get('/api/v1/system/health').set(ORGANIZER).expect(403);

    redis.store.set(`auth:suspended:${FAN_ID}`, '1');
    const suspended = await http().get('/api/v1/leagues').set(FAN).expect(403);
    expect(suspended.body.code).toBe('ACCOUNT_SUSPENDED');
    redis.store.delete(`auth:suspended:${FAN_ID}`);
  });

  it('CORS: rechaza orígenes no permitidos y responde el preflight del origen de la web', async () => {
    await http().get('/api/v1/leagues').set('Origin', 'https://malicioso.ejemplo.test').expect(403);
    const preflight = await http()
      .options('/api/v1/leagues')
      .set({ Origin: WEB_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' })
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(preflight.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rate limiting: el cuarto intento de inicio de sesión en la ventana responde 429 con Retry-After', async () => {
    const login = () => http().post('/api/v1/auth/login').send({ email: 'ana@ejemplo.test', password: 'clave-de-prueba' });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await login().expect(200);
      expect(res.headers['x-ratelimit-remaining']).toBe(String(3 - attempt));
    }
    const blocked = await login().expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-limit']).toBe('3');
    expect(services.get('auth')!.calls.filter((c) => c.path === '/api/v1/auth/login')).toHaveLength(3);
  });

  it('si un microservicio no responde, el gateway contesta 503 con un mensaje claro', async () => {
    const res = await http().get(`/api/v1/analytics/team-trend/${TEAM_ID}`).expect(503);
    expect(res.body).toEqual({ statusCode: 503, service: 'analytics', message: 'El servicio analytics no está disponible en este momento' });
  });

  it('el administrador ve el estado agregado: 8 servicios arriba, Analytics caído y Redis arriba', async () => {
    const res = await http().get('/api/v1/system/health').set(ADMIN).expect(200);
    expect(res.body).toMatchObject({ overall: 'degraded', summary: { up: 8, total: 9 }, redis: { status: 'up' } });
    const status = Object.fromEntries(res.body.services.map((s: { name: string; status: string }) => [s.name, s.status]));
    expect(status).toMatchObject({ league: 'up', auth: 'up', 'live-score': 'up', analytics: 'down' });
  });

  it('/docs y /openapi.json documentan las rutas del gateway con el esquema Bearer para probarlas con un JWT', async () => {
    const doc = await http().get('/openapi.json').expect(200);
    expect(doc.body.info.title).toBe('SportsLeague · api-gateway');
    expect(doc.body.components.securitySchemes.bearer).toMatchObject({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
    expect(doc.body.paths['/api/v1/system/health'].get).toMatchObject({ tags: ['system'], security: [{ bearer: [] }] });
    expect(doc.body.paths['/health'].get.security).toBeUndefined();
    const page = await http().get('/docs').expect(200);
    expect(page.text).toContain('swagger-ui');
  });

  it('con METRICS_TOKEN, /metrics del gateway acepta ese Bearer (no lo trata como JWT) y rechaza al resto', async () => {
    process.env.METRICS_TOKEN = 'secreto-de-metricas';
    try {
      await http().get('/metrics').expect(401);
      await http().get('/metrics').set(ADMIN).expect(401); // un JWT válido no sirve como METRICS_TOKEN
      const res = await http().get('/metrics').set('Authorization', 'Bearer secreto-de-metricas').expect(200);
      expect(res.text).toContain('http_requests_total');
    } finally {
      delete process.env.METRICS_TOKEN;
    }
  });

  it('/metrics cuenta peticiones por ruta, reenvíos por microservicio y rechazos por rate limiting', async () => {
    const res = await http().get('/metrics').expect(200);
    expect(res.text).toContain(`http_requests_total{method="GET",route="/api/v1/matches/:id/live",status="200"} 1`);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/leagues",status="401"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/login",status="429"} 1');
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/system/health",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/system/health",status="200"} 1');
    expect(res.text).toContain('gateway_requests_total{service="league",method="POST",status="200"} 1');
    expect(res.text).toContain('gateway_requests_total{service="auth",method="POST",status="200"} 3');
    expect(res.text).toContain('gateway_requests_total{service="analytics",method="GET",status="503"} 1');
    expect(res.text).toContain('gateway_rate_limit_rejections_total{tier="auth"} 1');
  });
});
