/**
 * Prueba de integración de Notification Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Simulado:
 * - El relé de correo (Google Apps Script): un servidor HTTP local con el mismo contrato que
 *   apps-script/enviar-correo.gs (clave compartida y respuesta { ok }). No sale ningún correo real.
 * - Team Service: el mismo servidor responde los nombres de los equipos.
 * - Redis: el bus de eventos en memoria (entrega los eventos como lo harían los demás servicios).
 * - Web Push: sin claves VAPID, el push queda SIMULATED (el envío cifrado se prueba en push.spec.ts).
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
import { InMemoryEventBus, type EventEnvelope } from '../../src/chassis';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/notification_db?schema=pruebas';
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

const RELAY_SECRET = 'clave-del-rele-de-prueba';
const WEB_URL = 'https://web.ejemplo.test';

const ORGANIZER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const LAURA_ID = '60000000-0000-4000-8000-000000000001';
const PEDRO_ID = '60000000-0000-4000-8000-000000000002';
const LAURA_EMAIL = 'laura.gomez@ejemplo.test';
const ADMIN = asUser({ id: '60000000-0000-4000-8000-000000000009', role: 'ADMIN', email: 'admin@ejemplo.test' });
const LAURA = asUser({ id: LAURA_ID, role: 'FAN', email: LAURA_EMAIL, name: 'Laura Gómez' });
const PEDRO = asUser({ id: PEDRO_ID, role: 'FAN', email: 'pedro.diaz@ejemplo.test', name: 'Pedro Díaz' });

const LEAGUE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MATCH_ID = '30000000-0000-4000-8000-000000000001';
const TIGRES = '10000000-0000-4000-8000-000000000001';
const LEONES = '10000000-0000-4000-8000-000000000002';

const relay = { down: false, mails: [] as { secret: string; to: string; subject: string; body: string }[] };
const teamCalls: string[] = [];
const upstreamServer = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://servicios.local');
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'POST' && url.pathname === '/exec') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (relay.down) return send(503, { error: 'Servicio no disponible' });
      const mail = JSON.parse(raw);
      if (mail.secret !== RELAY_SECRET) return send(200, { ok: false, error: 'no autorizado' });
      relay.mails.push(mail);
      return send(200, { ok: true, remaining: 99 });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/teams') {
    teamCalls.push(url.searchParams.get('ids') ?? '');
    return send(200, [
      { id: TIGRES, name: 'Tigres' },
      { id: LEONES, name: 'Leones' },
    ]);
  }
  return send(404, { statusCode: 404, message: 'No encontrado' });
});

describe('Notification Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;
  let resultEvent: EventEnvelope;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    await new Promise<void>((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(upstreamServer.address() as AddressInfo).port}`;
    process.env.MAIL_RELAY_URL = `${url}/exec`;
    process.env.MAIL_RELAY_SECRET = RELAY_SECRET;
    process.env.TEAM_SERVICE_URL = url;
    process.env.WEB_URL = WEB_URL;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
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

  const http = () => request(app.getHttpServer());

  it('los aficionados siguen la liga, eligen sus canales y registran su navegador para push', async () => {
    await http().post('/api/v1/subscriptions').set(LAURA).send({ leagueId: LEAGUE_ID }).expect(201);
    await http().post('/api/v1/subscriptions').set(PEDRO).send({ leagueId: LEAGUE_ID }).expect(201);
    await http().put('/api/v1/notifications/preferences').set(PEDRO).send({ emailEnabled: false }).expect(200);

    const browser = { endpoint: 'https://push.ejemplo.test/laura', keys: { p256dh: 'clave-p256dh-de-prueba', auth: 'auth-de-prueba' } };
    await http().post('/api/v1/notifications/push/subscriptions').set(LAURA).send(browser).expect(201);
    await http()
      .post('/api/v1/notifications/push/subscriptions')
      .set(LAURA)
      .send({ ...browser, endpoint: 'http://push.ejemplo.test/sin-https' })
      .expect(400);

    await expect(prisma.subscription.count({ where: { leagueId: LEAGUE_ID } })).resolves.toBe(2);
    await expect(prisma.preference.findUnique({ where: { userId: PEDRO_ID } })).resolves.toMatchObject({ emailEnabled: false, pushEnabled: true });
    await expect(prisma.pushSubscription.findMany()).resolves.toEqual([expect.objectContaining({ userId: LAURA_ID, endpoint: browser.endpoint })]);
    const followers = await http().get(`/api/v1/subscriptions/leagues/${LEAGUE_ID}`).set(internalOnly).expect(200);
    expect(followers.body).toEqual({ leagueId: LEAGUE_ID, followers: 2 });
  });

  it('league.created avisa a los administradores por su rol', async () => {
    await bus.publish('league.created', { leagueId: LEAGUE_ID, name: 'Liga Universitaria', ownerId: ORGANIZER_ID, ownerName: 'Ana Pérez' });
    const inbox = await http().get('/api/v1/notifications').set(ADMIN).expect(200);
    expect(inbox.body.items).toEqual([
      expect.objectContaining({ role: 'ADMIN', type: 'LEAGUE_PENDING', body: 'Ana Pérez creó la liga "Liga Universitaria". Revísala para autorizarla.' }),
    ]);
  });

  it('match.completed avisa al organizador y a los aficionados, y envía el correo por el relé solo a quien lo tiene activo', async () => {
    resultEvent = await bus.publish('match.completed', {
      matchId: MATCH_ID,
      leagueId: LEAGUE_ID,
      ownerId: ORGANIZER_ID,
      homeTeamId: TIGRES,
      awayTeamId: LEONES,
      homeScore: 2,
      awayScore: 1,
      version: 1,
      reason: 'final',
    });

    const notifications = await prisma.notification.findMany({ where: { type: 'MATCH_RESULT' } });
    expect(notifications.map((n) => n.userId).sort()).toEqual([ORGANIZER_ID, LAURA_ID, PEDRO_ID].sort());
    expect(notifications.every((n) => n.title === 'Resultado final' && n.body === 'Tigres 2 - 1 Leones')).toBe(true);
    expect(teamCalls).toEqual([`${TIGRES},${LEONES}`]); // nombres de los equipos desde Team Service

    // Pedro desactivó el correo y el organizador no sigue la liga: solo Laura recibe correo.
    expect(relay.mails).toEqual([
      {
        secret: RELAY_SECRET,
        to: LAURA_EMAIL,
        subject: 'Resultado final',
        body: `Tigres 2 - 1 Leones\n\nVer en SportsLeague: ${WEB_URL}/partidos/${MATCH_ID}`,
      },
    ]);
    const deliveries = await prisma.delivery.findMany({ where: { subject: 'Resultado final' } });
    expect(deliveries.map((d) => `${d.channel}:${d.status}`).sort()).toEqual(['EMAIL:SENT', 'PUSH:SIMULATED', 'PUSH:SIMULATED', 'PUSH:SIMULATED']);
  });

  it('si el mismo mensaje se entrega dos veces no se duplican avisos ni correos (idempotencia)', async () => {
    // Redis puede reentregar un evento: llega con el mismo id y no debe generar nada nuevo.
    await app.get(NotificationsService).onMatchCompleted(resultEvent);
    await expect(prisma.notification.count({ where: { type: 'MATCH_RESULT' } })).resolves.toBe(3);
    await expect(prisma.delivery.count({ where: { subject: 'Resultado final' } })).resolves.toBe(4);
    expect(relay.mails).toHaveLength(1);
  });

  it('con el relé de correo caído el aviso llega igual a la bandeja y el envío queda FAILED', async () => {
    relay.down = true;
    try {
      await bus.publish('fixture.published', {
        leagueId: LEAGUE_ID,
        leagueName: 'Liga Universitaria',
        categoryName: 'Libre',
        ownerId: ORGANIZER_ID,
        round: 2,
        matches: [{ matchId: MATCH_ID }, { matchId: '30000000-0000-4000-8000-000000000002' }],
      });
    } finally {
      relay.down = false;
    }
    await expect(prisma.notification.count({ where: { type: 'FIXTURE_PUBLISHED' } })).resolves.toBe(3);
    await expect(prisma.delivery.findMany({ where: { channel: 'EMAIL', subject: 'Jornada 2 programada' } })).resolves.toEqual([
      expect.objectContaining({ recipient: LAURA_EMAIL, status: 'FAILED' }),
    ]);
  });

  it('la aficionada ve sus avisos y los marca como leídos; otro usuario no puede tocarlos', async () => {
    const inbox = await http().get('/api/v1/notifications').set(LAURA).expect(200);
    expect(inbox.body.unread).toBe(2);
    expect(inbox.body.items.map((n: { type: string }) => n.type)).toEqual(['FIXTURE_PUBLISHED', 'MATCH_RESULT']);
    const notificationId = inbox.body.items[1].id;

    await http().patch(`/api/v1/notifications/${notificationId}/read`).set(PEDRO).expect(404);
    await http().get(`/api/v1/notifications/${LAURA_ID}`).set(PEDRO).expect(403);
    await expect(prisma.notification.findUnique({ where: { id: notificationId } })).resolves.toMatchObject({ read: false });

    await http().patch(`/api/v1/notifications/${notificationId}/read`).set(LAURA).expect(200);
    const unread = await http().get('/api/v1/notifications/unread-count').set(LAURA).expect(200);
    expect(unread.body).toEqual({ unread: 1 });
  });

  it('el registro de envíos es solo del administrador', async () => {
    await http().get('/api/v1/notifications/deliveries').set(LAURA).expect(403);
    const log = await http().get('/api/v1/notifications/deliveries').set(ADMIN).expect(200);
    expect(log.body).toHaveLength(8);
    expect(new Set(log.body.map((d: { status: string }) => d.status))).toEqual(new Set(['SENT', 'FAILED', 'SIMULATED']));
  });

  it('/metrics cuenta peticiones, avisos por tipo y envíos por canal y resultado', async () => {
    const res = await http().get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/subscriptions",status="201"} 2');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/notifications/push/subscriptions",status="400"} 1');
    expect(res.text).toContain('http_requests_total{method="PATCH",route="/api/v1/notifications/:id/read",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="PATCH",route="/api/v1/notifications/:id/read",status="404"} 1');
    expect(res.text).toContain('http_requests_total{method="GET",route="/api/v1/notifications/deliveries",status="403"} 1');
    expect(res.text).toContain('notifications_created_total{type="LEAGUE_PENDING"} 1');
    expect(res.text).toContain('notifications_created_total{type="MATCH_RESULT"} 3');
    expect(res.text).toContain('notifications_created_total{type="FIXTURE_PUBLISHED"} 3');
    expect(res.text).toContain('notification_deliveries_total{channel="EMAIL",status="SENT"} 1');
    expect(res.text).toContain('notification_deliveries_total{channel="EMAIL",status="FAILED"} 1');
    expect(res.text).toContain('notification_deliveries_total{channel="PUSH",status="SIMULATED"} 6');
  });
});
