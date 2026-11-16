/**
 * Prueba de integración de Fixture Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Simulado:
 * - League Service y Team Service: un servidor HTTP local que responde la estructura de la temporada
 *   y los equipos de la categoría como los reales. Los clientes (ServiceClient: token interno,
 *   reintentos, circuit breaker) son los de producción, así que las llamadas viajan por HTTP.
 * - Redis: el bus de eventos en memoria. Con él se comprueban los eventos publicados y se entregan
 *   match.started y match.completed como lo haría el Live Score Service.
 *
 * Base: TEST_DATABASE_URL. En local, la PostgreSQL de docker compose (docker compose up -d postgres).
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { InMemoryEventBus } from '../../src/chassis';
import type { FixturePublishedEvent } from '../../src/fixtures/events';
import { PrismaService } from '../../src/prisma/prisma.service';
import { INTERNAL_TOKEN, asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/fixture_db?schema=pruebas';
const BASE_SCHEMA = new URL(BASE_DB_URL).searchParams.get('schema');
if (!BASE_SCHEMA || BASE_SCHEMA === 'public') {
  throw new Error('TEST_DATABASE_URL debe indicar un esquema propio (por ejemplo ?schema=pruebas) para no tocar los datos');
}
// Esquema propio de esta ejecución (<esquema>_<sufijo aleatorio>): dos ejecuciones a la vez no chocan.
const SCHEMA = `${BASE_SCHEMA}_${randomBytes(4).toString('hex')}`;
const DB_URL = (() => {
  const url = new URL(BASE_DB_URL);
  url.searchParams.set('schema', SCHEMA);
  return url.toString();
})();

const ORGANIZER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ORGANIZER = asUser({ id: ORGANIZER_ID, role: 'ORGANIZER', name: 'Ana Pérez' });
const LEAGUE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEASON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NORTH_VENUE_ID = 'eeeeeeee-eeee-4eee-8eee-000000000001';
const SOUTH_VENUE_ID = 'eeeeeeee-eeee-4eee-8eee-000000000002';
const UNKNOWN_VENUE_ID = 'eeeeeeee-eeee-4eee-8eee-000000000099';
const WEEKEND = [6, 0]; // sábado y domingo

/** Respuesta de GET /api/v1/internal/seasons/:id/structure del League Service. */
const STRUCTURE = {
  season: { id: SEASON_ID, leagueId: LEAGUE_ID, name: 'Apertura 2026', year: 2026, startDate: '2026-02-02', endDate: '2026-06-30' },
  league: { id: LEAGUE_ID, name: 'Liga Universitaria', sport: 'FOOTBALL', status: 'APPROVED', ownerId: ORGANIZER_ID },
  categories: [{ id: CATEGORY_ID, name: 'Libre', minAge: 18, maxAge: 35 }],
  venues: [
    { id: NORTH_VENUE_ID, name: 'Cancha Norte', zone: 'Norte', availableDays: WEEKEND, openTime: '08:00', closeTime: '18:00' },
    { id: SOUTH_VENUE_ID, name: 'Cancha Sur', zone: 'Sur', availableDays: WEEKEND, openTime: '08:00', closeTime: '18:00' },
  ],
};
/** Respuesta de GET /api/v1/teams?categoryId=… del Team Service. */
const TEAMS = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Tigres', categoryId: CATEGORY_ID, homeVenueId: NORTH_VENUE_ID },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Leones', categoryId: CATEGORY_ID, homeVenueId: null },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Águilas', categoryId: CATEGORY_ID, homeVenueId: null },
  { id: '10000000-0000-4000-8000-000000000004', name: 'Toros', categoryId: CATEGORY_ID, homeVenueId: null },
];

const upstream = { calls: [] as { url: string; headers: IncomingHttpHeaders }[] };
const upstreamServer = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://servicios.local');
  upstream.calls.push({ url: `${url.pathname}${url.search}`, headers: req.headers });
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && url.pathname === `/api/v1/internal/seasons/${SEASON_ID}/structure`) return send(200, STRUCTURE);
  if (req.method === 'GET' && url.pathname === '/api/v1/teams' && url.searchParams.get('categoryId') === CATEGORY_ID) {
    return send(200, TEAMS);
  }
  return send(404, { statusCode: 404, message: 'No encontrado' });
});

describe('Fixture Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;
  let fixtureId: string;
  let matchIds: string[];

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    await new Promise<void>((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(upstreamServer.address() as AddressInfo).port}`;
    process.env.LEAGUE_SERVICE_URL = url;
    process.env.TEAM_SERVICE_URL = url;
    process.env.DATABASE_URL = DB_URL;
    ({ app, bus } = await createTestApp(AppModule));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    upstreamServer.closeAllConnections();
    await new Promise((resolve) => upstreamServer.close(resolve));
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await admin.$disconnect();
  });

  const generate = () =>
    request(app.getHttpServer())
      .post(`/api/v1/seasons/${SEASON_ID}/fixtures/generate`)
      .set(ORGANIZER)
      .send({ categoryId: CATEGORY_ID, shuffle: false });

  it('genera el calendario en borrador: todos contra todos, en los días de las canchas, guardado en PostgreSQL', async () => {
    const res = await generate().expect(201);
    fixtureId = res.body.id;
    matchIds = res.body.matches.map((m: { id: string }) => m.id);
    expect(res.body).toMatchObject({ status: 'DRAFT', totalRounds: 3, warnings: [] });

    const matches = await prisma.match.findMany({ where: { fixtureId } });
    expect(matches).toHaveLength(6);
    const pairs = new Set(matches.map((m) => [m.homeTeamId, m.awayTeamId].sort().join('|')));
    expect(pairs.size).toBe(6); // 4 equipos: cada cruce una sola vez
    expect(matches.every((m) => WEEKEND.includes(m.scheduledAt.getUTCDay()))).toBe(true);
    expect(matches.every((m) => m.scheduledAt >= new Date('2026-02-02'))).toBe(true);
    expect(bus.published.filter((e) => e.type === 'fixture.published')).toHaveLength(0);

    // Contrato con League Service y Team Service: consultas con el token interno.
    expect(upstream.calls.map((c) => c.url)).toEqual([
      `/api/v1/internal/seasons/${SEASON_ID}/structure`,
      `/api/v1/teams?categoryId=${CATEGORY_ID}`,
    ]);
    expect(upstream.calls.every((c) => c.headers['x-internal-token'] === INTERNAL_TOKEN)).toBe(true);
  });

  it('el borrador solo lo ve el organizador; el calendario público sale vacío', async () => {
    const anonymous = await request(app.getHttpServer()).get(`/api/v1/seasons/${SEASON_ID}/fixtures`).set(internalOnly).expect(200);
    expect(anonymous.body).toEqual([]);
    const organizer = await request(app.getHttpServer()).get(`/api/v1/seasons/${SEASON_ID}/fixtures`).set(ORGANIZER).expect(200);
    expect(organizer.body).toHaveLength(1);
  });

  it('publica el calendario y emite un fixture.published por jornada con equipos y canchas', async () => {
    await request(app.getHttpServer()).post(`/api/v1/fixtures/${fixtureId}/publish`).set(ORGANIZER).expect(201);
    const saved = await prisma.fixture.findUnique({ where: { id: fixtureId } });
    expect(saved?.status).toBe('PUBLISHED');
    expect(saved?.publishedAt).toBeInstanceOf(Date);

    const events = bus.published.filter((e) => e.type === 'fixture.published').map((e) => e.data as FixturePublishedEvent);
    expect(events.map((e) => e.round)).toEqual([1, 2, 3]);
    expect(events.every((e) => e.matches.length === 2 && e.categoryName === 'Libre' && e.leagueName === 'Liga Universitaria')).toBe(true);
    const names = TEAMS.map((t) => t.name);
    expect(events.flatMap((e) => e.matches).every((m) => names.includes(m.homeTeamName) && names.includes(m.awayTeamName))).toBe(true);
  });

  it('responde 409 al regenerar un calendario ya publicado y no cambia los partidos', async () => {
    await generate().expect(409);
    await expect(prisma.match.count({ where: { fixtureId } })).resolves.toBe(6);
  });

  it('suspende un partido y lo reprograma en otra cancha: guarda el cambio y avisa con eventos', async () => {
    const matchId = matchIds[0];
    const before = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });

    await request(app.getHttpServer())
      .patch(`/api/v1/matches/${matchId}/status`)
      .set(ORGANIZER)
      .send({ status: 'SUSPENDED', reason: 'Cancha inundada por la lluvia' })
      .expect(200);
    await expect(prisma.match.findUnique({ where: { id: matchId } })).resolves.toMatchObject({
      status: 'SUSPENDED',
      suspensionReason: 'Cancha inundada por la lluvia',
    });
    expect(bus.published.find((e) => e.type === 'match.suspended')?.data).toMatchObject({
      matchId,
      previousStatus: 'SCHEDULED',
    });

    await request(app.getHttpServer())
      .put(`/api/v1/matches/${matchId}/venue`)
      .set(ORGANIZER)
      .send({ venueId: SOUTH_VENUE_ID, scheduledAt: '2026-03-14T20:00:00.000Z' })
      .expect(200);
    await expect(prisma.match.findUnique({ where: { id: matchId } })).resolves.toMatchObject({
      status: 'SCHEDULED',
      suspensionReason: null,
      venueId: SOUTH_VENUE_ID,
      scheduledAt: new Date('2026-03-14T20:00:00.000Z'),
    });
    expect(bus.published.find((e) => e.type === 'match.rescheduled')?.data).toMatchObject({
      matchId,
      venueName: 'Cancha Sur',
      scheduledAt: '2026-03-14T20:00:00.000Z',
      previousScheduledAt: before.scheduledAt.toISOString(),
    });
  });

  it('responde 400 si la cancha nueva no es de la liga y no cambia el partido', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/matches/${matchIds[0]}/venue`)
      .set(ORGANIZER)
      .send({ venueId: UNKNOWN_VENUE_ID })
      .expect(400);
    await expect(prisma.match.findUnique({ where: { id: matchIds[0] } })).resolves.toMatchObject({ venueId: SOUTH_VENUE_ID });
  });

  it('actualiza el estado con match.started y match.completed del Live Score Service, sin retroceder', async () => {
    const matchId = matchIds[1];
    await bus.publish('match.started', { matchId });
    await expect(prisma.match.findUnique({ where: { id: matchId } })).resolves.toMatchObject({ status: 'LIVE' });

    await bus.publish('match.completed', { matchId, homeScore: 2, awayScore: 1 });
    await bus.publish('match.started', { matchId }); // repetido o fuera de orden: no lo vuelve a poner en vivo
    await expect(prisma.match.findUnique({ where: { id: matchId } })).resolves.toMatchObject({ status: 'FINISHED' });

    const finished = await request(app.getHttpServer())
      .get(`/api/v1/matches?seasonId=${SEASON_ID}&status=FINISHED`)
      .set(internalOnly)
      .expect(200);
    expect(finished.body.map((m: { id: string }) => m.id)).toEqual([matchId]);
  });

  it('/metrics cuenta las peticiones por ruta y código, y los calendarios generados', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    const generateRoute = 'route="/api/v1/seasons/:seasonId/fixtures/generate"';
    expect(res.text).toContain(`http_requests_total{method="POST",${generateRoute},status="201"} 1`);
    expect(res.text).toContain(`http_requests_total{method="POST",${generateRoute},status="409"} 1`);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/fixtures/:id/publish",status="201"} 1');
    expect(res.text).toContain('http_requests_total{method="PATCH",route="/api/v1/matches/:id/status",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="PUT",route="/api/v1/matches/:id/venue",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="PUT",route="/api/v1/matches/:id/venue",status="400"} 1');
    expect(res.text).toContain('fixtures_generated_total{outcome="ok"} 1');
  });
});
