/**
 * Prueba de integración de Referee Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Lo único simulado es Redis: el bus de eventos en memoria. Con él se entrega fixture.published
 * como lo haría el Fixture Service y se comprueban referee.assigned y referee.unassigned. Este
 * servicio no hace llamadas REST a otros microservicios.
 *
 * Base: TEST_DATABASE_URL. En local, la PostgreSQL de docker compose (docker compose up -d postgres).
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { InMemoryEventBus } from '../../src/chassis';
import { PrismaService } from '../../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/referee_db?schema=pruebas';
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
const CARLOS_EMAIL = 'carlos.ruiz@ejemplo.test';
const MARTA_EMAIL = 'marta.leon@ejemplo.test';
const CARLOS = asUser({ id: '20000000-0000-4000-8000-000000000001', role: 'REFEREE', email: CARLOS_EMAIL, name: 'Carlos Ruiz' });
const MARTA = asUser({ id: '20000000-0000-4000-8000-000000000002', role: 'REFEREE', email: MARTA_EMAIL, name: 'Marta León' });
const FAN = asUser({ id: '20000000-0000-4000-8000-000000000003', role: 'FAN', email: 'aficionado@ejemplo.test' });

const LEAGUE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MATCH_NORTH = '30000000-0000-4000-8000-000000000001'; // sábado 10:00 en la zona Norte
const MATCH_SOUTH = '30000000-0000-4000-8000-000000000002'; // sábado 15:00 en la zona Sur
const MATCH_SUNDAY = '30000000-0000-4000-8000-000000000003'; // domingo: nadie está disponible
const SATURDAY = 6;

/** Disponibilidad de los sábados de 08:00 a 20:00 (hora local de la liga, UTC-5). */
const saturdays = [{ dayOfWeek: SATURDAY, startTime: '08:00', endTime: '20:00' }];

/** Evento fixture.published tal como lo publica el Fixture Service. 2027-03-06 es sábado. */
function fixturePublished(round: number, matches: { id: string; home: string; away: string; zone: string; at: string }[]) {
  return {
    fixtureId: '40000000-0000-4000-8000-000000000001',
    leagueId: LEAGUE_ID,
    leagueName: 'Liga Universitaria',
    seasonId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    categoryId: CATEGORY_ID,
    categoryName: 'Libre',
    ownerId: ORGANIZER_ID,
    round,
    totalRounds: 2,
    matches: matches.map((m) => ({
      matchId: m.id,
      homeTeamId: '10000000-0000-4000-8000-000000000001',
      awayTeamId: '10000000-0000-4000-8000-000000000002',
      homeTeamName: m.home,
      awayTeamName: m.away,
      venueId: null,
      venueName: `Cancha ${m.zone}`,
      venueZone: m.zone,
      scheduledAt: m.at,
    })),
  };
}
const ROUND_1 = fixturePublished(1, [
  { id: MATCH_NORTH, home: 'Tigres', away: 'Leones', zone: 'Norte', at: '2027-03-06T15:00:00.000Z' },
  { id: MATCH_SOUTH, home: 'Águilas', away: 'Toros', zone: 'Sur', at: '2027-03-06T20:00:00.000Z' },
]);
const ROUND_2 = fixturePublished(2, [
  { id: MATCH_SUNDAY, home: 'Leones', away: 'Águilas', zone: 'Norte', at: '2027-03-07T15:00:00.000Z' },
]);

describe('Referee Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;
  let carlosId: string;
  let martaId: string;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    process.env.DATABASE_URL = DB_URL;
    ({ app, bus } = await createTestApp(AppModule));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await admin.$disconnect();
  });

  const assignmentOf = async (matchId: string) =>
    prisma.refereeAssignment.findMany({ where: { matchId }, include: { referee: true }, orderBy: { createdAt: 'asc' } });
  const check = (matchId: string, email: string) =>
    request(app.getHttpServer()).get(`/api/v1/internal/assignments/check?matchId=${matchId}&email=${email}`).set(internalOnly).expect(200);

  it('registra árbitros con su zona y disponibilidad en PostgreSQL', async () => {
    const carlos = await request(app.getHttpServer())
      .post('/api/v1/referees')
      .set(ORGANIZER)
      .send({ name: 'Carlos Ruiz', email: CARLOS_EMAIL, zone: 'Norte', availability: saturdays })
      .expect(201);
    carlosId = carlos.body.id;
    const marta = await request(app.getHttpServer())
      .post('/api/v1/referees')
      .set(ORGANIZER)
      .send({ name: 'Marta León', email: MARTA_EMAIL, zone: 'Sur', availability: saturdays })
      .expect(201);
    martaId = marta.body.id;

    expect(carlos.body).toMatchObject({ ownerId: ORGANIZER_ID, zone: 'Norte', availability: [expect.objectContaining(saturdays[0])] });
    await expect(prisma.referee.count()).resolves.toBe(2);
    await expect(prisma.availability.count()).resolves.toBe(2);
  });

  it('responde 409 con un correo repetido y 400 con una franja horaria invertida, sin guardar nada', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/referees')
      .set(ORGANIZER)
      .send({ name: 'Carlos Ruiz', email: CARLOS_EMAIL, zone: 'Centro', availability: saturdays })
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/v1/referees')
      .set(ORGANIZER)
      .send({
        name: 'Pedro Gil',
        email: 'pedro.gil@ejemplo.test',
        zone: 'Centro',
        availability: [{ dayOfWeek: SATURDAY, startTime: '20:00', endTime: '08:00' }],
      })
      .expect(400);
    await expect(prisma.referee.count()).resolves.toBe(2);
  });

  it('con fixture.published asigna a cada partido el árbitro de la misma zona y publica referee.assigned', async () => {
    await bus.publish('fixture.published', ROUND_1);

    await expect(prisma.scheduledMatch.count()).resolves.toBe(2);
    expect((await assignmentOf(MATCH_NORTH)).map((a) => [a.referee.name, a.status])).toEqual([['Carlos Ruiz', 'ASSIGNED']]);
    expect((await assignmentOf(MATCH_SOUTH)).map((a) => [a.referee.name, a.status])).toEqual([['Marta León', 'ASSIGNED']]);

    const assigned = bus.published.filter((e) => e.type === 'referee.assigned').map((e) => e.data);
    expect(assigned).toEqual([
      expect.objectContaining({ matchId: MATCH_NORTH, refereeName: 'Carlos Ruiz', label: 'Tigres vs Leones', manual: false }),
      expect.objectContaining({ matchId: MATCH_SOUTH, refereeName: 'Marta León', label: 'Águilas vs Toros', manual: false }),
    ]);
  });

  it('si fixture.published llega dos veces no duplica las asignaciones (idempotencia)', async () => {
    await bus.publish('fixture.published', ROUND_1);
    await expect(prisma.refereeAssignment.count()).resolves.toBe(2);
    expect(bus.published.filter((e) => e.type === 'referee.assigned')).toHaveLength(2);
  });

  it('avisa con referee.unassigned si nadie está disponible ese día y no inventa una asignación', async () => {
    await bus.publish('fixture.published', ROUND_2);
    await expect(prisma.scheduledMatch.findUnique({ where: { matchId: MATCH_SUNDAY } })).resolves.toMatchObject({ round: 2 });
    await expect(assignmentOf(MATCH_SUNDAY)).resolves.toEqual([]);
    expect(bus.published.find((e) => e.type === 'referee.unassigned')?.data).toMatchObject({ matchId: MATCH_SUNDAY, ownerId: ORGANIZER_ID });
  });

  it('el árbitro ve su partido y lo confirma; un aficionado no puede confirmar por él', async () => {
    const mine = await request(app.getHttpServer()).get('/api/v1/assignments/mine').set(CARLOS).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({ refereeId: carlosId, match: { matchId: MATCH_NORTH, label: 'Tigres vs Leones' } });
    const assignmentId = mine.body[0].id;

    await request(app.getHttpServer()).put(`/api/v1/assignments/${assignmentId}/confirm`).set(FAN).send({ confirmed: true }).expect(403);
    await expect(prisma.refereeAssignment.findUnique({ where: { id: assignmentId } })).resolves.toMatchObject({ status: 'ASSIGNED' });

    await request(app.getHttpServer()).put(`/api/v1/assignments/${assignmentId}/confirm`).set(CARLOS).send({ confirmed: true }).expect(200);
    await expect(prisma.refereeAssignment.findUnique({ where: { id: assignmentId } })).resolves.toMatchObject({
      status: 'CONFIRMED',
      confirmed: true,
    });

    // Consulta interna que usa el Live Score Service antes de dejar que el árbitro registre eventos.
    expect((await check(MATCH_NORTH, CARLOS_EMAIL)).body).toEqual({ assigned: true, refereeName: 'Carlos Ruiz' });
  });

  it('si el árbitro rechaza el partido se asigna un reemplazo disponible', async () => {
    const mine = await request(app.getHttpServer()).get('/api/v1/assignments/mine').set(MARTA).expect(200);
    expect(mine.body.map((a: { matchId: string }) => a.matchId)).toEqual([MATCH_SOUTH]);

    await request(app.getHttpServer()).put(`/api/v1/assignments/${mine.body[0].id}/confirm`).set(MARTA).send({ confirmed: false }).expect(200);

    // Carlos está libre a las 15:00 (su otro partido es a las 10:00), así que queda como reemplazo.
    expect((await assignmentOf(MATCH_SOUTH)).map((a) => [a.refereeId, a.status])).toEqual([
      [martaId, 'DECLINED'],
      [carlosId, 'ASSIGNED'],
    ]);
    expect(bus.published.filter((e) => e.type === 'referee.assigned').at(-1)?.data).toMatchObject({
      matchId: MATCH_SOUTH,
      refereeName: 'Carlos Ruiz',
    });
    expect((await check(MATCH_SOUTH, MARTA_EMAIL)).body).toEqual({ assigned: false, refereeName: null });
    expect((await check(MATCH_SOUTH, CARLOS_EMAIL)).body).toEqual({ assigned: true, refereeName: 'Carlos Ruiz' });
  });

  it('/metrics cuenta las peticiones por ruta y código, y las asignaciones automáticas', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/referees",status="201"} 2');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/referees",status="409"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/referees",status="400"} 1');
    expect(res.text).toContain('http_requests_total{method="PUT",route="/api/v1/assignments/:id/confirm",status="200"} 2');
    expect(res.text).toContain('http_requests_total{method="PUT",route="/api/v1/assignments/:id/confirm",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/internal/assignments/check",status="200"} 3');
    expect(res.text).toContain('referee_assignments_total{outcome="assigned",mode="auto"} 3');
    expect(res.text).toContain('referee_assignments_total{outcome="unassigned",mode="auto"} 1');
  });
});
