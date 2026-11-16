/**
 * Prueba de integración de Team Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Simulado:
 * - League Service: un servidor HTTP local que responde GET /api/v1/categories/:id como el real.
 *   El cliente del servicio (ServiceClient: token interno, reintentos, circuit breaker) es el de
 *   producción, así que la llamada viaja por HTTP de verdad.
 * - Redis: el bus de eventos en memoria y un doble del cliente (la caché del rango de edad).
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
import { CacheService } from '../../src/chassis';
import { PrismaService } from '../../src/prisma/prisma.service';
import { INTERNAL_TOKEN, asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/team_db?schema=pruebas';
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
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const UNKNOWN_CATEGORY_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** League Service simulado: la categoría «Libre» admite jugadores de 18 a 35 años. */
const league = {
  down: false,
  calls: [] as { method?: string; url?: string; headers: IncomingHttpHeaders }[],
  categories: new Map([
    [
      CATEGORY_ID,
      {
        id: CATEGORY_ID,
        name: 'Libre',
        minAge: 18,
        maxAge: 35,
        league: { id: LEAGUE_ID, name: 'Liga Universitaria', sport: 'FOOTBALL', status: 'APPROVED', ownerId: ORGANIZER_ID },
      },
    ],
  ]),
};
const leagueServer = createServer((req, res) => {
  league.calls.push({ method: req.method, url: req.url, headers: req.headers });
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (league.down) return send(503, { statusCode: 503, message: 'Servicio no disponible' });
  const id = /^\/api\/v1\/categories\/([0-9a-f-]+)$/.exec(req.url ?? '')?.[1];
  const category = id ? league.categories.get(id) : undefined;
  if (req.method === 'GET' && category) return send(200, category);
  return send(404, { statusCode: 404, message: 'Categoría no encontrada' });
});

/** Fecha de nacimiento de alguien que cumplió `years` años hace 10 días: no depende del día en que corra. */
function bornYearsAgo(years: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 10);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

describe('Team Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let prisma: PrismaService;
  let teamId: string;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    await new Promise<void>((resolve) => leagueServer.listen(0, '127.0.0.1', resolve));
    process.env.LEAGUE_SERVICE_URL = `http://127.0.0.1:${(leagueServer.address() as AddressInfo).port}`;
    process.env.DATABASE_URL = DB_URL;
    ({ app } = await createTestApp(AppModule));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    leagueServer.closeAllConnections();
    await new Promise((resolve) => leagueServer.close(resolve));
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await admin.$disconnect();
  });

  const addPlayer = (player: Record<string, unknown>) =>
    request(app.getHttpServer()).post(`/api/v1/teams/${teamId}/players`).set(ORGANIZER).send(player);

  it('registra el equipo con los datos de la categoría que devuelve League Service', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set(ORGANIZER)
      .send({ categoryId: CATEGORY_ID, name: 'Tigres del Sinú', coachName: 'Luis Gómez' })
      .expect(201);
    teamId = res.body.id;
    expect(res.body).toMatchObject({ leagueId: LEAGUE_ID, categoryId: CATEGORY_ID, ownerId: ORGANIZER_ID });
    await expect(prisma.team.findUnique({ where: { id: teamId } })).resolves.toMatchObject({
      name: 'Tigres del Sinú',
      coachName: 'Luis Gómez',
    });
    // Contrato con League Service: pide la categoría con el token interno y el usuario de la sesión.
    expect(league.calls[0]).toMatchObject({
      method: 'GET',
      url: `/api/v1/categories/${CATEGORY_ID}`,
      headers: { 'x-internal-token': INTERNAL_TOKEN, 'x-user-id': ORGANIZER_ID },
    });
  });

  it('responde 404 si League Service no conoce la categoría y no guarda el equipo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set(ORGANIZER)
      .send({ categoryId: UNKNOWN_CATEGORY_ID, name: 'Sin categoría' })
      .expect(404);
    await expect(prisma.team.count()).resolves.toBe(1);
  });

  it('ficha jugadores y calcula su elegibilidad con el rango de edad de la categoría (18 a 35)', async () => {
    const adult = await addPlayer({
      firstName: 'Camilo',
      lastName: 'Rojas',
      birthDate: bornYearsAgo(25),
      jerseyNumber: 10,
      documentId: '1001234567',
    }).expect(201);
    expect(adult.body).toMatchObject({ eligibilityStatus: 'ELIGIBLE', eligibilityNote: 'Edad 25: dentro del rango de la categoría' });

    const minor = await addPlayer({ firstName: 'Mateo', lastName: 'Díaz', birthDate: bornYearsAgo(15), jerseyNumber: 7 }).expect(201);
    expect(minor.body).toMatchObject({ eligibilityStatus: 'INELIGIBLE', eligibilityNote: 'Tiene 15 años; la categoría exige mínimo 18' });

    const saved = await prisma.player.findMany({ where: { teamId }, orderBy: { jerseyNumber: 'asc' } });
    expect(saved.map((p) => [p.jerseyNumber, p.eligibilityStatus])).toEqual([
      [7, 'INELIGIBLE'],
      [10, 'ELIGIBLE'],
    ]);
  });

  it('responde 409 si el número de camiseta ya está ocupado en el equipo (restricción única de PostgreSQL)', async () => {
    await addPlayer({ firstName: 'Andrés', lastName: 'Mora', birthDate: bornYearsAgo(22), jerseyNumber: 10 }).expect(409);
    await expect(prisma.player.count({ where: { teamId } })).resolves.toBe(2);
  });

  it('responde 400 con un número de camiseta fuera de rango y no guarda nada', async () => {
    await addPlayer({ firstName: 'Andrés', lastName: 'Mora', birthDate: bornYearsAgo(22), jerseyNumber: 120 }).expect(400);
    await expect(prisma.player.count({ where: { teamId } })).resolves.toBe(2);
  });

  it('si League Service no responde usa el rango guardado en caché; sin caché el jugador queda pendiente', async () => {
    league.down = true;
    try {
      const fromCache = await addPlayer({ firstName: 'Jorge', lastName: 'Pineda', birthDate: bornYearsAgo(40) }).expect(201);
      expect(fromCache.body).toMatchObject({
        eligibilityStatus: 'INELIGIBLE',
        eligibilityNote: 'Tiene 40 años; la categoría permite máximo 35',
      });

      // La caché del rango dura 24 horas: se borra para simular que expiró.
      await app.get(CacheService).del(`team:category-range:${CATEGORY_ID}`);
      const pending = await addPlayer({ firstName: 'Sergio', lastName: 'Vega', birthDate: bornYearsAgo(20) }).expect(201);
      expect(pending.body.eligibilityStatus).toBe('PENDING');
      await expect(prisma.player.findUnique({ where: { id: pending.body.id } })).resolves.toMatchObject({
        eligibilityStatus: 'PENDING',
      });
    } finally {
      league.down = false;
    }
  });

  it('GET /teams/:id/players muestra el documento de identidad solo al organizador', async () => {
    const anonymous = await request(app.getHttpServer()).get(`/api/v1/teams/${teamId}/players`).set(internalOnly).expect(200);
    expect(anonymous.body).toHaveLength(4);
    expect(anonymous.body.every((p: Record<string, unknown>) => !('documentId' in p))).toBe(true);

    const organizer = await request(app.getHttpServer()).get(`/api/v1/teams/${teamId}/players`).set(ORGANIZER).expect(200);
    expect(organizer.body.find((p: { jerseyNumber: number }) => p.jerseyNumber === 10)).toMatchObject({ documentId: '1001234567' });
  });

  it('/metrics cuenta las peticiones por ruta y código, y las llamadas a League Service', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/teams",status="201"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/teams",status="404"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/teams/:id/players",status="201"} 4');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/teams/:id/players",status="409"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/teams/:id/players",status="400"} 1');
    expect(res.text).toContain('upstream_requests_total{target="league-service",outcome="ok"} 4');
    expect(res.text).toContain('upstream_requests_total{target="league-service",outcome="client_error"} 1');
    expect(res.text).toContain('upstream_requests_total{target="league-service",outcome="error"} 2');
  });
});
