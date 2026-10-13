import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { createAuthMiddleware } from '../src/gateway/auth.middleware';
import { createProxyDispatcher } from '../src/gateway/proxy';
import { createRateLimiter } from '../src/gateway/rate-limit.middleware';
import type { ServiceName } from '../src/gateway/routes';

process.env.LOG_LEVEL = 'error';

const SECRET = 'test-secret';
const token = (role: string, sub = '11111111-1111-4111-8111-111111111111') =>
  sign({ email: 'ana@liga.com', name: 'Ana Pérez', role }, SECRET, {
    subject: sub,
    expiresIn: 60,
    issuer: 'sportsleague-auth',
    audience: 'sportsleague',
  });

describe('API Gateway (integración con un microservicio simulado)', () => {
  let upstream: Server;
  let gateway: express.Express;
  const suspended = new Set<string>();

  beforeAll(async () => {
    // Microservicio falso que devuelve las cabeceras que recibió.
    upstream = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ path: req.url, method: req.method, headers: req.headers, body }));
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    const { port } = upstream.address() as AddressInfo;
    const target = `http://127.0.0.1:${port}`;
    const urls = Object.fromEntries(
      ['auth', 'league', 'team', 'fixture', 'referee', 'live-score', 'statistics', 'notification', 'analytics'].map((name) => [name, target]),
    ) as Record<ServiceName, string>;

    const counts = new Map<string, number>();
    gateway = express();
    gateway.use(createAuthMiddleware({ secret: SECRET, internalToken: 'internal-123', isSuspended: async (id) => suspended.has(id) }));
    gateway.use(
      createRateLimiter(async (key) => {
        counts.set(key, (counts.get(key) ?? 0) + 1);
        return counts.get(key)!;
      }, { auth: 100, write: 100, read: 100, windowSeconds: 60 }),
    );
    gateway.use(createProxyDispatcher(urls));
  });

  afterAll(async () => {
    await new Promise((resolve) => upstream.close(resolve));
  });

  it('las lecturas públicas pasan sin sesión y llevan el token interno', async () => {
    const res = await request(gateway).get('/api/v1/leagues?sport=FOOTBALL').expect(200);
    expect(res.body.path).toBe('/api/v1/leagues?sport=FOOTBALL');
    expect(res.body.headers['x-internal-token']).toBe('internal-123');
    expect(res.body.headers['x-user-id']).toBeUndefined();
  });

  it('las escrituras exigen un JWT válido', async () => {
    await request(gateway).post('/api/v1/leagues').send({ name: 'Liga' }).expect(401);
    const res = await request(gateway).post('/api/v1/leagues').set('Authorization', 'Bearer basura').send({}).expect(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });

  it('propaga la identidad y reenvía el cuerpo sin modificar', async () => {
    const res = await request(gateway)
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${token('ORGANIZER')}`)
      .send({ name: 'Liga del Sinú' })
      .expect(200);
    expect(res.body.headers['x-user-id']).toBe('11111111-1111-4111-8111-111111111111');
    expect(res.body.headers['x-user-role']).toBe('ORGANIZER');
    expect(decodeURIComponent(res.body.headers['x-user-name'])).toBe('Ana Pérez');
    expect(JSON.parse(res.body.body)).toEqual({ name: 'Liga del Sinú' });
  });

  it('elimina cabeceras de identidad falsificadas por el cliente', async () => {
    const res = await request(gateway)
      .get('/api/v1/leagues')
      .set('x-user-id', 'hacker')
      .set('x-user-role', 'ADMIN')
      .set('x-internal-token', 'falso')
      .expect(200);
    expect(res.body.headers['x-user-id']).toBeUndefined();
    expect(res.body.headers['x-user-role']).toBeUndefined();
    expect(res.body.headers['x-internal-token']).toBe('internal-123');
  });

  it('restringe las rutas de administración y bloquea las internas', async () => {
    await request(gateway).get('/api/v1/users').set('Authorization', `Bearer ${token('ORGANIZER')}`).expect(403);
    await request(gateway).get('/api/v1/users').set('Authorization', `Bearer ${token('ADMIN')}`).expect(200);
    await request(gateway).get('/api/v1/internal/seasons/x/structure').expect(404);
  });

  it('bloquea de inmediato a un usuario suspendido', async () => {
    suspended.add('99999999-9999-4999-8999-999999999999');
    await request(gateway)
      .get('/api/v1/leagues/mine')
      .set('Authorization', `Bearer ${token('ORGANIZER', '99999999-9999-4999-8999-999999999999')}`)
      .expect(403);
  });
});
