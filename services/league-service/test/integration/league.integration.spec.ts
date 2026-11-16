/**
 * Prueba de integración de League Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Lo único simulado es Redis: el bus de eventos en memoria (con él se comprueba league.created) y
 * un doble del cliente. Este flujo no llama a otros microservicios.
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
import { asUser, createTestApp } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/league_db?schema=pruebas';
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

const ORGANIZER = asUser({ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', role: 'ORGANIZER', name: 'Ana Pérez' });
const OTHER_ORGANIZER = asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' });

describe('League Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;
  let leagueId: string;

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

  it('crea la liga, le agrega una temporada y GET /leagues/:id la devuelve con ella', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(ORGANIZER)
      .send({ name: 'Liga Universitaria', sport: 'FOOTBALL', city: 'Montería' })
      .expect(201);
    leagueId = created.body.id;
    expect(created.body).toMatchObject({ status: 'PENDING', ownerName: 'Ana Pérez' });
    await expect(prisma.league.findUnique({ where: { id: leagueId } })).resolves.toMatchObject({
      name: 'Liga Universitaria',
      status: 'PENDING',
    });
    expect(bus.published.find((event) => event.type === 'league.created')?.data).toMatchObject({ leagueId });

    await request(app.getHttpServer())
      .post(`/api/v1/leagues/${leagueId}/seasons`)
      .set(ORGANIZER)
      .send({ name: 'Apertura 2026', year: 2026, startDate: '2026-02-01', endDate: '2026-06-30' })
      .expect(201);

    const detail = await request(app.getHttpServer()).get(`/api/v1/leagues/${leagueId}`).set(ORGANIZER).expect(200);
    expect(detail.body.seasons).toEqual([expect.objectContaining({ name: 'Apertura 2026', year: 2026 })]);
  });

  it('responde 401 sin el token interno y no guarda nada', async () => {
    await request(app.getHttpServer()).post('/api/v1/leagues').send({ name: 'Sin token', sport: 'FOOTBALL' }).expect(401);
    await expect(prisma.league.count()).resolves.toBe(1);
  });

  it('responde 400 si la fecha de inicio no es anterior a la de fin y no guarda la temporada', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/leagues/${leagueId}/seasons`)
      .set(ORGANIZER)
      .send({ name: 'Clausura 2026', year: 2026, startDate: '2026-12-01', endDate: '2026-12-01' })
      .expect(400);
    await expect(prisma.season.count({ where: { leagueId } })).resolves.toBe(1);
  });

  it('responde 403 si otro organizador intenta agregar una temporada', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/leagues/${leagueId}/seasons`)
      .set(OTHER_ORGANIZER)
      .send({ name: 'Ajena', year: 2026, startDate: '2026-07-01', endDate: '2026-11-30' })
      .expect(403);
    await expect(prisma.season.count({ where: { leagueId } })).resolves.toBe(1);
  });

  it('/metrics cuenta las peticiones por ruta y código de respuesta', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/leagues",status="201"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/leagues/:id/seasons",status="400"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/leagues/:id/seasons",status="403"} 1');
  });
});
