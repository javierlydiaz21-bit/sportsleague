/**
 * Prueba de integración de Live Score Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores), la pone a escuchar en
 * un puerto libre y hace las peticiones con Supertest. Un espectador se conecta por WebSocket
 * (socket.io-client) al canal /live. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con
 * las migraciones antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Simulado:
 * - Fixture, Referee y Team Service: un servidor HTTP local que responde el partido, la verificación
 *   del árbitro asignado y la plantilla como los reales. Los clientes (ServiceClient: token interno,
 *   reintentos, circuit breaker) son los de producción, así que las llamadas viajan por HTTP.
 * - Redis: el bus de eventos en memoria y un doble del cliente (caché y conteo de espectadores).
 *
 * Base: TEST_DATABASE_URL. En local, la PostgreSQL de docker compose (docker compose up -d postgres).
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { InMemoryEventBus } from '../../src/chassis';
import { PrismaService } from '../../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/livescore_db?schema=pruebas';
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
const REFEREE_EMAIL = 'carlos.ruiz@ejemplo.test';
const REFEREE = asUser({ id: '20000000-0000-4000-8000-000000000001', role: 'REFEREE', email: REFEREE_EMAIL, name: 'Carlos Ruiz' });
const OTHER_REFEREE = asUser({ id: '20000000-0000-4000-8000-000000000002', role: 'REFEREE', email: 'otro.arbitro@ejemplo.test' });

const LEAGUE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEASON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MATCH_ID = '30000000-0000-4000-8000-000000000001';
const DRAFT_MATCH_ID = '30000000-0000-4000-8000-000000000002'; // su calendario sigue en borrador
const HOME = '10000000-0000-4000-8000-000000000001';
const AWAY = '10000000-0000-4000-8000-000000000002';
const HOME_PLAYER_1 = '50000000-0000-4000-8000-000000000001';
const HOME_PLAYER_2 = '50000000-0000-4000-8000-000000000002';
const AWAY_PLAYER = '50000000-0000-4000-8000-000000000003';

/** Partido tal como lo devuelve GET /api/v1/matches/:id del Fixture Service. */
const fixtureMatch = (id: string, fixtureStatus: 'DRAFT' | 'PUBLISHED') => ({
  id,
  leagueId: LEAGUE_ID,
  seasonId: SEASON_ID,
  categoryId: CATEGORY_ID,
  ownerId: ORGANIZER_ID,
  homeTeamId: HOME,
  awayTeamId: AWAY,
  status: 'SCHEDULED',
  fixtureStatus,
  scheduledAt: '2027-03-06T15:00:00.000Z',
});

const upstreamCalls: string[] = [];
const upstreamServer = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://servicios.local');
  upstreamCalls.push(`${url.pathname}${url.search}`);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === `/api/v1/matches/${MATCH_ID}`) return send(200, fixtureMatch(MATCH_ID, 'PUBLISHED'));
  if (url.pathname === `/api/v1/matches/${DRAFT_MATCH_ID}`) return send(200, fixtureMatch(DRAFT_MATCH_ID, 'DRAFT'));
  if (url.pathname === '/api/v1/internal/assignments/check') {
    const assigned = url.searchParams.get('matchId') === MATCH_ID && url.searchParams.get('email') === REFEREE_EMAIL;
    return send(200, { assigned, refereeName: assigned ? 'Carlos Ruiz' : null });
  }
  if (url.pathname === '/api/v1/players' && url.searchParams.get('teamIds') === `${HOME},${AWAY}`) {
    return send(200, [
      { id: HOME_PLAYER_1, teamId: HOME },
      { id: HOME_PLAYER_2, teamId: HOME },
      { id: AWAY_PLAYER, teamId: AWAY },
    ]);
  }
  return send(404, { statusCode: 404, message: 'No encontrado' });
});

/** Espera el siguiente mensaje del WebSocket que cumpla la condición. */
function nextMessage<T>(socket: Socket, channel: string, accept: (data: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve) => {
    const handler = (data: T) => {
      if (!accept(data)) return;
      socket.off(channel, handler);
      resolve(data);
    };
    socket.on(channel, handler);
  });
}

describe('Live Score Service · integración con PostgreSQL y WebSocket', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;
  let spectator: Socket;
  let lateGoalId: string;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    await new Promise<void>((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(upstreamServer.address() as AddressInfo).port}`;
    process.env.FIXTURE_SERVICE_URL = url;
    process.env.REFEREE_SERVICE_URL = url;
    process.env.TEAM_SERVICE_URL = url;
    process.env.DATABASE_URL = DB_URL;
    ({ app, bus } = await createTestApp(AppModule));
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    spectator?.disconnect();
    await app?.close();
    upstreamServer.closeAllConnections();
    await new Promise((resolve) => upstreamServer.close(resolve));
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await admin.$disconnect();
  });

  const addEvent = (user: Record<string, string>, event: Record<string, unknown>) =>
    request(app.getHttpServer()).post(`/api/v1/matches/${MATCH_ID}/events`).set(user).send(event);

  it('no inicia un partido cuyo calendario no está publicado (409) y no guarda nada', async () => {
    await request(app.getHttpServer()).post(`/api/v1/matches/${DRAFT_MATCH_ID}/start`).set(ORGANIZER).expect(409);
    await expect(prisma.liveMatch.count()).resolves.toBe(0);
  });

  it('el árbitro asignado inicia el partido: se guarda en PostgreSQL y se publica match.started', async () => {
    const res = await request(app.getHttpServer()).post(`/api/v1/matches/${MATCH_ID}/start`).set(REFEREE).expect(200);
    expect(res.body).toMatchObject({ status: 'LIVE', homeTeamId: HOME, awayTeamId: AWAY, score: { home: 0, away: 0 } });
    await expect(prisma.liveMatch.findUnique({ where: { matchId: MATCH_ID } })).resolves.toMatchObject({
      status: 'LIVE',
      ownerId: ORGANIZER_ID,
      leagueId: LEAGUE_ID,
    });
    expect(bus.published.find((e) => e.type === 'match.started')?.data).toMatchObject({ matchId: MATCH_ID, homeTeamId: HOME });
    // Consultó el partido a Fixture, el permiso del árbitro a Referee y la plantilla a Team.
    expect(upstreamCalls).toEqual(
      expect.arrayContaining([
        `/api/v1/matches/${MATCH_ID}`,
        `/api/v1/internal/assignments/check?matchId=${MATCH_ID}&email=${encodeURIComponent(REFEREE_EMAIL)}`,
        `/api/v1/players?teamIds=${encodeURIComponent(`${HOME},${AWAY}`)}`,
      ]),
    );
  });

  it('un espectador conectado por WebSocket recibe el gol con el marcador apenas el árbitro lo registra', async () => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    spectator = io(`http://127.0.0.1:${port}/live`, { transports: ['websocket'] });
    const snapshot = nextMessage<{ status: string }>(spectator, 'match:snapshot');
    spectator.on('connect', () => spectator.emit('subscribe', { matchId: MATCH_ID }));
    await expect(snapshot).resolves.toMatchObject({ status: 'LIVE', score: { home: 0, away: 0 } });

    const pushed = nextMessage(spectator, 'match:event');
    const res = await addEvent(REFEREE, { type: 'GOAL', teamId: HOME, playerId: HOME_PLAYER_1, minute: 12 }).expect(201);
    expect(res.body.score).toEqual({ home: 1, away: 0 });
    await expect(pushed).resolves.toMatchObject({ matchId: MATCH_ID, type: 'GOAL', minute: 12, score: { home: 1, away: 0 } });
    await expect(prisma.matchEvent.count({ where: { matchId: MATCH_ID } })).resolves.toBe(1);
  });

  it('rechaza un jugador de otro equipo (400) y a un árbitro no asignado (403) sin guardar nada', async () => {
    await addEvent(REFEREE, { type: 'GOAL', teamId: AWAY, playerId: HOME_PLAYER_1, minute: 20 }).expect(400);
    await addEvent(OTHER_REFEREE, { type: 'GOAL', teamId: AWAY, playerId: AWAY_PLAYER, minute: 20 }).expect(403);
    await expect(prisma.matchEvent.count({ where: { matchId: MATCH_ID } })).resolves.toBe(1);
  });

  it('al finalizar guarda el acta y publica match.completed con el marcador calculado de los eventos', async () => {
    await addEvent(REFEREE, { type: 'GOAL', teamId: AWAY, playerId: AWAY_PLAYER, minute: 30 }).expect(201);
    await addEvent(REFEREE, { type: 'YELLOW_CARD', teamId: HOME, playerId: HOME_PLAYER_2, minute: 40 }).expect(201);
    const late = await addEvent(REFEREE, { type: 'GOAL', teamId: HOME, playerId: HOME_PLAYER_2, minute: 75 }).expect(201);
    lateGoalId = late.body.event.id;
    expect(late.body.score).toEqual({ home: 2, away: 1 });

    const finalSnapshot = nextMessage<{ status: string }>(spectator, 'match:snapshot', (s) => s.status === 'FINISHED');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/matches/${MATCH_ID}/complete`)
      .set(REFEREE)
      .send({ attendance: 350, notes: 'Sin novedades' })
      .expect(200);
    expect(res.body).toMatchObject({ status: 'FINISHED', score: { home: 2, away: 1 }, attendance: 350, version: 1 });
    await expect(finalSnapshot).resolves.toMatchObject({ status: 'FINISHED', score: { home: 2, away: 1 } });

    await expect(prisma.liveMatch.findUnique({ where: { matchId: MATCH_ID } })).resolves.toMatchObject({
      status: 'FINISHED',
      attendance: 350,
      notes: 'Sin novedades',
      version: 1,
    });
    const acta = bus.published.filter((e) => e.type === 'match.completed').map((e) => e.data as Record<string, unknown>);
    expect(acta).toHaveLength(1);
    expect(acta[0]).toMatchObject({ matchId: MATCH_ID, homeScore: 2, awayScore: 1, version: 1, reason: 'final', attendance: 350 });
    expect(acta[0].events).toHaveLength(4);
  });

  it('tras el cierre solo el organizador corrige el acta, que se republica con una versión nueva', async () => {
    await addEvent(REFEREE, { type: 'GOAL', teamId: AWAY, playerId: AWAY_PLAYER, minute: 88 }).expect(403);

    const res = await request(app.getHttpServer()).delete(`/api/v1/matches/${MATCH_ID}/events/${lateGoalId}`).set(ORGANIZER).expect(200);
    expect(res.body.score).toEqual({ home: 1, away: 1 });
    await expect(prisma.matchEvent.count({ where: { matchId: MATCH_ID } })).resolves.toBe(3);

    const acta = bus.published.filter((e) => e.type === 'match.completed').map((e) => e.data);
    expect(acta.at(-1)).toMatchObject({ homeScore: 1, awayScore: 1, version: 2, reason: 'correction' });

    const publicList = await request(app.getHttpServer()).get(`/api/v1/live/matches?ids=${MATCH_ID}`).set(internalOnly).expect(200);
    expect(publicList.body).toEqual([expect.objectContaining({ matchId: MATCH_ID, status: 'FINISHED', score: { home: 1, away: 1 } })]);
  });

  it('/metrics cuenta peticiones por ruta y código, eventos registrados y la latencia del marcador en vivo', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    const ids = `league_id="${LEAGUE_ID}",season_id="${SEASON_ID}",category_id="${CATEGORY_ID}"`;
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/matches/:id/start",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/matches/:id/start",status="409"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/matches/:id/events",status="201"} 4');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/matches/:id/events",status="400"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/matches/:id/events",status="403"} 2');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/matches/:id/complete",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="DELETE",route="/api/v1/matches/:id/events/:eventId",status="200"} 1');
    expect(res.text).toContain(`match_events_registered_total{type="GOAL",${ids}} 3`);
    expect(res.text).toContain(`match_events_registered_total{type="YELLOW_CARD",${ids}} 1`);
    // Cada difusión por WebSocket mide su latencia: 4 eventos + 1 borrado, en cada canal (/live y /live-scores).
    expect(res.text).toContain('live_score_update_latency_seconds_count 10');
  });
});
