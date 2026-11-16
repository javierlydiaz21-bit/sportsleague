/**
 * Prueba de integración de Statistics Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Simulado:
 * - League Service y Live Score Service: un servidor HTTP local que responde el reglamento, la
 *   temporada y las actas oficiales como los reales. Los clientes (ServiceClient: token interno,
 *   reintentos, circuit breaker) son los de producción, así que las llamadas viajan por HTTP.
 * - Redis: el bus de eventos en memoria (entrega fixture.published y match.completed como lo harían
 *   Fixture y Live Score) y un doble del cliente, con el que funciona la caché de la tabla.
 *
 * Base: TEST_DATABASE_URL. En local, la PostgreSQL de docker compose (docker compose up -d postgres).
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { InMemoryEventBus } from '../../src/chassis';
import { PrismaService } from '../../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/statistics_db?schema=pruebas';
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
const OTHER_ORGANIZER = asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' });

const LEAGUE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEASON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TIGRES = '10000000-0000-4000-8000-000000000001';
const LEONES = '10000000-0000-4000-8000-000000000002';
const AGUILAS = '10000000-0000-4000-8000-000000000003';
const TOROS = '10000000-0000-4000-8000-000000000004';
const CAMILO = '50000000-0000-4000-8000-000000000001'; // Tigres
const MATEO = '50000000-0000-4000-8000-000000000002'; // Leones
const ANDRES = '50000000-0000-4000-8000-000000000003'; // Leones
const JORGE = '50000000-0000-4000-8000-000000000004'; // Toros
const SERGIO = '50000000-0000-4000-8000-000000000005'; // Águilas
const TIGRES_LEONES = '30000000-0000-4000-8000-000000000001';
const AGUILAS_TOROS = '30000000-0000-4000-8000-000000000002';

const goal = (teamId: string, playerId: string, minute: number) => ({ type: 'GOAL', teamId, playerId, value: 1, minute });
const card = (type: 'YELLOW_CARD' | 'RED_CARD', teamId: string, playerId: string, minute: number) => ({ type, teamId, playerId, value: 1, minute });

/** Acta match.completed tal como la publica el Live Score Service. */
function acta(matchId: string, home: string, away: string, version: number, events: ReturnType<typeof goal>[]) {
  const score = (team: string) => events.filter((e) => e.type === 'GOAL' && e.teamId === team).length;
  return {
    matchId,
    leagueId: LEAGUE_ID,
    seasonId: SEASON_ID,
    categoryId: CATEGORY_ID,
    ownerId: ORGANIZER_ID,
    homeTeamId: home,
    awayTeamId: away,
    homeScore: score(home),
    awayScore: score(away),
    version,
    reason: version === 1 ? 'final' : 'correction',
    completedAt: '2027-03-06T17:00:00.000Z',
    attendance: 200,
    events,
  };
}
const TIGRES_LEONES_V1 = acta(TIGRES_LEONES, TIGRES, LEONES, 1, [
  goal(TIGRES, CAMILO, 10),
  goal(LEONES, MATEO, 30),
  card('YELLOW_CARD', LEONES, ANDRES, 40),
  goal(TIGRES, CAMILO, 75),
]);
// Corrección del organizador: el gol del minuto 75 se anuló (versión 2 del acta).
const TIGRES_LEONES_V2 = acta(TIGRES_LEONES, TIGRES, LEONES, 2, TIGRES_LEONES_V1.events.slice(0, 3));
// Acta que Statistics nunca recibió (evento perdido): solo existe en el Live Score Service.
const AGUILAS_TOROS_V1 = acta(AGUILAS_TOROS, AGUILAS, TOROS, 1, [
  goal(TOROS, JORGE, 5),
  card('RED_CARD', AGUILAS, SERGIO, 20),
  goal(TOROS, JORGE, 50),
  goal(TOROS, JORGE, 88),
]);
/** Formato de GET /api/v1/live/matches del Live Score Service. */
const liveActa = (a: typeof TIGRES_LEONES_V1) => ({
  ...a,
  status: 'FINISHED',
  finishedAt: a.completedAt,
  score: { home: a.homeScore, away: a.awayScore },
});

const upstreamCalls: string[] = [];
const upstreamServer = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://servicios.local');
  upstreamCalls.push(url.pathname);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === `/api/v1/categories/${CATEGORY_ID}/rules`) {
    return send(200, { categoryId: CATEGORY_ID, pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakerCriteria: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'] });
  }
  if (url.pathname === `/api/v1/seasons/${SEASON_ID}`) return send(200, { id: SEASON_ID, league: { id: LEAGUE_ID, ownerId: ORGANIZER_ID } });
  if (url.pathname === '/api/v1/live/matches' && url.searchParams.get('status') === 'FINISHED') {
    return send(200, [liveActa(TIGRES_LEONES_V2), liveActa(AGUILAS_TOROS_V1)]);
  }
  return send(404, { statusCode: 404, message: 'No encontrado' });
});

describe('Statistics Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    await new Promise<void>((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(upstreamServer.address() as AddressInfo).port}`;
    process.env.LEAGUE_SERVICE_URL = url;
    process.env.LIVE_SCORE_SERVICE_URL = url;
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

  const get = (path: string) => request(app.getHttpServer()).get(`/api/v1/${path}/${SEASON_ID}?categoryId=${CATEGORY_ID}`).set(internalOnly).expect(200);
  const pointsByTeam = (rows: { teamId: string; points: number }[]) => Object.fromEntries(rows.map((r) => [r.teamId, r.points]));

  it('con fixture.published crea la tabla con los cuatro equipos en cero', async () => {
    await bus.publish('fixture.published', {
      seasonId: SEASON_ID,
      categoryId: CATEGORY_ID,
      matches: [
        { homeTeamId: TIGRES, awayTeamId: LEONES },
        { homeTeamId: AGUILAS, awayTeamId: TOROS },
      ],
    });
    await expect(prisma.standing.count({ where: { seasonId: SEASON_ID } })).resolves.toBe(4);
    const table = await get('standings');
    expect(table.body.every((row: { played: number; points: number }) => row.played === 0 && row.points === 0)).toBe(true);
  });

  it('con match.completed guarda el acta y recalcula tabla, goleadores y tarjetas con el reglamento de League Service', async () => {
    await bus.publish('match.completed', TIGRES_LEONES_V1);
    await expect(prisma.matchResult.findUnique({ where: { matchId: TIGRES_LEONES } })).resolves.toMatchObject({ homeScore: 2, awayScore: 1, version: 1 });
    expect(upstreamCalls).toContain(`/api/v1/categories/${CATEGORY_ID}/rules`);

    const table = await get('standings');
    expect(table.body[0]).toMatchObject({ teamId: TIGRES, position: 1, played: 1, wins: 1, points: 3, goalsFor: 2, goalsAgainst: 1, form: ['G'] });
    expect(table.body[3]).toMatchObject({ teamId: LEONES, position: 4, losses: 1, points: 0, goalDifference: -1, form: ['P'] });
    expect(bus.published.filter((e) => e.type === 'standings.updated').at(-1)?.data).toMatchObject({ reason: 'match.completed', leaderTeamId: TIGRES });

    // Segunda consulta: sale de la caché (Redis) con el mismo contenido.
    expect((await get('standings')).body).toEqual(table.body);

    const scorers = await get('top-scorers');
    expect(scorers.body.map((s: { playerId: string; goals: number }) => [s.playerId, s.goals])).toEqual([
      [CAMILO, 2],
      [MATEO, 1],
    ]);
    const discipline = await get('disciplinary');
    expect(discipline.body).toEqual([expect.objectContaining({ playerId: ANDRES, teamId: LEONES, yellowCards: 1, redCards: 0 })]);
  });

  it('un acta repetida no duplica efectos, la corrección se aplica y una versión vieja se ignora', async () => {
    await bus.publish('match.completed', TIGRES_LEONES_V1); // repetida
    await bus.publish('match.completed', TIGRES_LEONES_V2); // corrección: 1-1
    await bus.publish('match.completed', TIGRES_LEONES_V1); // llega tarde una versión anterior

    await expect(prisma.matchResult.findUnique({ where: { matchId: TIGRES_LEONES } })).resolves.toMatchObject({ homeScore: 1, awayScore: 1, version: 2 });
    const table = await get('standings');
    expect(pointsByTeam(table.body)).toEqual({ [TIGRES]: 1, [LEONES]: 1, [AGUILAS]: 0, [TOROS]: 0 });
    expect(table.body.find((row: { teamId: string }) => row.teamId === TIGRES)).toMatchObject({ played: 1, draws: 1 });
    await expect(prisma.topScorer.findMany({ where: { seasonId: SEASON_ID } })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ playerId: CAMILO, goals: 1 })]),
    );
  });

  it('el organizador recalcula con conciliación y recupera del Live Score Service el acta que se había perdido', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/statistics/recalculate')
      .set(ORGANIZER)
      .send({ seasonId: SEASON_ID, categoryId: CATEGORY_ID, reconcile: true })
      .expect(200);
    expect(res.body.reconciled).toBe(1); // la versión 2 de Tigres-Leones ya estaba: solo se agrega Águilas-Toros
    await expect(prisma.matchResult.count()).resolves.toBe(2);

    const table = await get('standings');
    expect(table.body[0]).toMatchObject({ teamId: TOROS, points: 3, goalDifference: 3 });
    expect(table.body[3]).toMatchObject({ teamId: AGUILAS, points: 0, goalDifference: -3 });
    const scorers = await get('top-scorers');
    expect(scorers.body[0]).toMatchObject({ playerId: JORGE, teamId: TOROS, goals: 3 });
    const discipline = await get('disciplinary');
    expect(discipline.body[0]).toMatchObject({ playerId: SERGIO, redCards: 1 });
  });

  it('responde 403 si otro organizador intenta recalcular y 400 con una temporada inválida', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/statistics/recalculate')
      .set(OTHER_ORGANIZER)
      .send({ seasonId: SEASON_ID, categoryId: CATEGORY_ID })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/statistics/recalculate')
      .set(ORGANIZER)
      .send({ seasonId: 'temporada-1', categoryId: CATEGORY_ID })
      .expect(400);
    await expect(prisma.matchResult.count()).resolves.toBe(2);
  });

  it('/metrics cuenta peticiones, recálculos por motivo y aciertos de la caché de la tabla', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/standings/:seasonId",status="200"} 5');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/statistics/recalculate",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/statistics/recalculate",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/statistics/recalculate",status="400"} 1');
    expect(res.text).toContain('standings_recalculations_total{reason="fixture.published",outcome="ok"} 1');
    // El acta original, la repetida y la corrección; la versión vieja no provoca recálculo.
    expect(res.text).toContain('standings_recalculations_total{reason="match.completed",outcome="ok"} 3');
    expect(res.text).toContain('standings_recalculations_total{reason="reconcile",outcome="ok"} 1');
    expect(res.text).toContain('standings_cache_requests_total{result="miss"} 4');
    expect(res.text).toContain('standings_cache_requests_total{result="hit"} 1');
  });
});
