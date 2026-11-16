/**
 * Prueba de integración de Analytics Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. Todo en PostgreSQL real, en esquemas aparte por ejecución que se borran al terminar:
 * - «pruebas_<sufijo>»: la base propia de Analytics, creada con sus migraciones.
 * - ese nombre con «_fixture», «_livescore» y «_statistics»: las réplicas que lee el ETL, con las
 *   tablas y columnas que consulta y unos datos conocidos. El ETL se conecta a ellas en modo de solo
 *   lectura (default_transaction_read_only), como el usuario analytics_ro de producción.
 *
 * Lo único simulado es Redis (el candado del ETL). Este servicio no consume eventos ni llama a otros.
 *
 * Base: TEST_DATABASE_URL. En local, la PostgreSQL de docker compose (docker compose up -d postgres).
 */
import { INestApplication } from '@nestjs/common';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/analytics_db?schema=pruebas';
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
const BASE_URL = DB_URL.split('?')[0];
const REPLICAS = { fixture: `${SCHEMA}_fixture`, livescore: `${SCHEMA}_livescore`, statistics: `${SCHEMA}_statistics` };
const ALL_SCHEMAS = [SCHEMA, ...Object.values(REPLICAS)];
/** Conexión de solo lectura a una réplica (equivale al usuario analytics_ro). */
const replicaUrl = (schema: string) =>
  `${BASE_URL}?options=${encodeURIComponent(`-c search_path=${schema} -c default_transaction_read_only=on`)}`;

const ORGANIZER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ADMIN = asUser({ id: '60000000-0000-4000-8000-000000000009', role: 'ADMIN' });
const ORGANIZER = asUser({ id: ORGANIZER_ID, role: 'ORGANIZER', name: 'Ana Pérez' });
const OTHER_ORGANIZER = asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' });
const FAN = asUser({ id: '60000000-0000-4000-8000-000000000001', role: 'FAN' });

const LEAGUE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEASON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TIGRES = '10000000-0000-4000-8000-000000000001';
const LEONES = '10000000-0000-4000-8000-000000000002';
const AGUILAS = '10000000-0000-4000-8000-000000000003';
const TOROS = '10000000-0000-4000-8000-000000000004';
const M1 = '30000000-0000-4000-8000-000000000001'; // Tigres 2-1 Leones (asistencia del acta: 350)
const M2 = '30000000-0000-4000-8000-000000000002'; // Toros 0-1 Tigres (sin asistencia: pico de 120 en línea)
const M3 = '30000000-0000-4000-8000-000000000003'; // Águilas vs Leones, suspendido
const M4 = '30000000-0000-4000-8000-000000000004'; // Leones vs Toros, programado
const M5 = '30000000-0000-4000-8000-000000000005'; // de un calendario en borrador: no cuenta

const match = (id: string, fixture: string, status: string, at: string, home: string, away: string, reason: string | null = null) =>
  `('${id}', '${fixture}', '${LEAGUE_ID}', '${SEASON_ID}', '${CATEGORY_ID}', '${ORGANIZER_ID}', '${status}', '${at}', ${reason ? `'${reason}'` : 'NULL'}, '${home}', '${away}')`;

/** Réplicas con las tablas y columnas que lee el ETL (etl.service.ts) y los datos de la prueba. */
const REPLICA_SQL = `
  CREATE SCHEMA "${REPLICAS.fixture}";
  CREATE TABLE "${REPLICAS.fixture}".fixtures (id uuid PRIMARY KEY, status text NOT NULL);
  CREATE TABLE "${REPLICAS.fixture}".matches (
    id uuid PRIMARY KEY, fixture_id uuid NOT NULL REFERENCES "${REPLICAS.fixture}".fixtures (id), league_id uuid NOT NULL,
    season_id uuid NOT NULL, category_id uuid NOT NULL, owner_id uuid NOT NULL, status text NOT NULL,
    scheduled_at timestamp(3) NOT NULL, suspension_reason text, home_team_id uuid NOT NULL, away_team_id uuid NOT NULL);
  INSERT INTO "${REPLICAS.fixture}".fixtures VALUES
    ('40000000-0000-4000-8000-000000000001', 'PUBLISHED'), ('40000000-0000-4000-8000-000000000002', 'DRAFT');
  INSERT INTO "${REPLICAS.fixture}".matches VALUES
    ${match(M1, '40000000-0000-4000-8000-000000000001', 'FINISHED', '2027-03-06 20:00', TIGRES, LEONES)},
    ${match(M2, '40000000-0000-4000-8000-000000000001', 'FINISHED', '2027-03-13 20:00', TOROS, TIGRES)},
    ${match(M3, '40000000-0000-4000-8000-000000000001', 'SUSPENDED', '2027-03-13 22:00', AGUILAS, LEONES, 'Cancha inundada por la lluvia')},
    ${match(M4, '40000000-0000-4000-8000-000000000001', 'SCHEDULED', '2027-03-20 20:00', LEONES, TOROS)},
    ${match(M5, '40000000-0000-4000-8000-000000000002', 'SCHEDULED', '2027-03-20 22:00', AGUILAS, TIGRES)};

  CREATE SCHEMA "${REPLICAS.livescore}";
  CREATE TABLE "${REPLICAS.livescore}".live_matches (match_id uuid PRIMARY KEY, status text NOT NULL, attendance int, peak_viewers int NOT NULL DEFAULT 0);
  CREATE TABLE "${REPLICAS.livescore}".match_events (id serial PRIMARY KEY, match_id uuid NOT NULL, type text NOT NULL, value int NOT NULL DEFAULT 1);
  INSERT INTO "${REPLICAS.livescore}".live_matches VALUES ('${M1}', 'FINISHED', 350, 80), ('${M2}', 'FINISHED', NULL, 120);
  INSERT INTO "${REPLICAS.livescore}".match_events (match_id, type) VALUES
    ('${M1}', 'GOAL'), ('${M1}', 'GOAL'), ('${M1}', 'GOAL'), ('${M1}', 'YELLOW_CARD'), ('${M2}', 'GOAL'), ('${M2}', 'RED_CARD');

  CREATE SCHEMA "${REPLICAS.statistics}";
  CREATE TABLE "${REPLICAS.statistics}".match_results (
    match_id uuid PRIMARY KEY, league_id uuid NOT NULL, season_id uuid NOT NULL, category_id uuid NOT NULL,
    home_team_id uuid NOT NULL, away_team_id uuid NOT NULL, home_score int NOT NULL, away_score int NOT NULL, completed_at timestamp(3) NOT NULL);
  INSERT INTO "${REPLICAS.statistics}".match_results VALUES
    ('${M1}', '${LEAGUE_ID}', '${SEASON_ID}', '${CATEGORY_ID}', '${TIGRES}', '${LEONES}', 2, 1, '2027-03-06 22:00'),
    ('${M2}', '${LEAGUE_ID}', '${SEASON_ID}', '${CATEGORY_ID}', '${TOROS}', '${TIGRES}', 0, 1, '2027-03-13 22:00');
`;

describe('Analytics Service · integración con PostgreSQL (ETL sobre réplicas de solo lectura)', () => {
  const admin = new Pool({ connectionString: BASE_URL, max: 1 });
  const dropAll = () => admin.query(ALL_SCHEMAS.map((schema) => `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`).join(' '));
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    await dropAll();
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    await admin.query(REPLICA_SQL);
    process.env.DATABASE_URL = DB_URL;
    process.env.FIXTURE_REPLICA_URL = replicaUrl(REPLICAS.fixture);
    process.env.LIVESCORE_REPLICA_URL = replicaUrl(REPLICAS.livescore);
    process.env.STATISTICS_REPLICA_URL = replicaUrl(REPLICAS.statistics);
    process.env.ETL_DISABLED = 'true'; // sin corridas programadas: la prueba lo ejecuta a mano
    ({ app } = await createTestApp(AppModule));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await dropAll();
    await admin.end();
  });

  const http = () => request(app.getHttpServer());

  it('el administrador ejecuta el ETL: extrae de las tres réplicas, transforma y carga la analítica', async () => {
    const res = await http().post('/api/v1/analytics/etl/run').set(ADMIN).expect(200);
    // 4 partidos publicados (el del borrador no) + 2 partidos en vivo + 6 eventos + 2 actas.
    expect(res.body).toMatchObject({ trigger: 'manual', status: 'SUCCESS', rowsProcessed: 14 });

    await expect(prisma.leagueKpi.findUnique({ where: { leagueId: LEAGUE_ID } })).resolves.toMatchObject({
      ownerId: ORGANIZER_ID,
      totalMatches: 4,
      scheduled: 1,
      live: 0,
      finished: 2,
      suspended: 1,
      totalGoals: 4,
      totalCards: 2,
      avgGoalsPerMatch: 2,
      avgAttendance: 235,
    });
    const overview = await http().get('/api/v1/analytics/overview').set(ADMIN).expect(200);
    expect(overview.body.totals).toMatchObject({ matches: 4, finished: 2, goals: 4, totalAttendance: 470, avgAttendance: 235 });
  });

  it('el organizador ve la asistencia estimada (acta o pico en línea) y los partidos suspendidos de su liga', async () => {
    const res = await http().get(`/api/v1/analytics/leagues/${LEAGUE_ID}`).set(ORGANIZER).expect(200);
    expect(res.body.attendance.map((a: { matchId: string; estimatedAttendance: number; source: string }) => [a.matchId, a.estimatedAttendance, a.source])).toEqual([
      [M1, 350, 'REPORTED'],
      [M2, 120, 'ONLINE_PEAK'],
    ]);
    expect(res.body.suspended).toEqual([expect.objectContaining({ matchId: M3, reason: 'Cancha inundada por la lluvia' })]);
  });

  it('otro organizador no ve la analítica ajena (403) y un aficionado no puede ejecutar el ETL (403)', async () => {
    await http().get(`/api/v1/analytics/leagues/${LEAGUE_ID}`).set(OTHER_ORGANIZER).expect(403);
    await http().post('/api/v1/analytics/etl/run').set(FAN).expect(403);
    await expect(prisma.etlRun.count()).resolves.toBe(1);
  });

  it('la tendencia del equipo acumula puntos y diferencia de gol partido a partido (pública)', async () => {
    const res = await http().get(`/api/v1/analytics/team-trend/${TIGRES}?seasonId=${SEASON_ID}`).set(internalOnly).expect(200);
    expect(res.body.map((t: { matchIndex: number; result: string; pointsCumulative: number; goalDifferenceCumulative: number }) => [t.matchIndex, t.result, t.pointsCumulative, t.goalDifferenceCumulative])).toEqual([
      [1, 'G', 3, 1],
      [2, 'G', 6, 2],
    ]);
  });

  it('una segunda corrida reescribe las tablas sin duplicar filas', async () => {
    await http().post('/api/v1/analytics/etl/run').set(ADMIN).expect(200);
    await expect(prisma.leagueKpi.count()).resolves.toBe(1);
    await expect(prisma.attendanceEstimate.count()).resolves.toBe(2);
    await expect(prisma.teamPerformanceTrend.count()).resolves.toBe(4);
    await expect(prisma.etlRun.count({ where: { status: 'SUCCESS' } })).resolves.toBe(2);
  });

  it('si una réplica falla, la corrida queda FAILED y la analítica anterior se conserva', async () => {
    await admin.query(`DROP TABLE "${REPLICAS.statistics}".match_results`);
    const res = await http().post('/api/v1/analytics/etl/run').set(ADMIN).expect(200);
    expect(res.body.status).toBe('FAILED');
    expect(res.body.error).toContain('match_results');
    await expect(prisma.leagueKpi.findUnique({ where: { leagueId: LEAGUE_ID } })).resolves.toMatchObject({ totalMatches: 4, totalGoals: 4 });
    const runs = await http().get('/api/v1/analytics/etl/runs').set(ADMIN).expect(200);
    expect(runs.body.map((r: { status: string }) => r.status)).toEqual(['FAILED', 'SUCCESS', 'SUCCESS']);
  });

  it('/metrics cuenta peticiones por ruta y código, y las corridas del ETL por resultado', async () => {
    const res = await http().get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/analytics/etl/run",status="200"} 3');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/analytics/etl/run",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/analytics/leagues/:leagueId",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/analytics/leagues/:leagueId",status="403"} 1');
    expect(res.text).toContain('etl_runs_total{status="success"} 2');
    expect(res.text).toContain('etl_runs_total{status="failed"} 1');
  });
});
