/**
 * Prueba de integración de Auth Service con PostgreSQL real.
 *
 * Levanta la aplicación completa (AppModule) con la misma configuración que producción
 * (configureApp: métricas, prefijo /api/v1, validación y filtro de errores) y hace las peticiones
 * con Supertest. La base es real: un esquema aparte por ejecución («pruebas_<sufijo>») que se crea con las migraciones
 * antes de empezar y se borra al terminar, sin tocar los datos de desarrollo.
 *
 * Lo único simulado es Redis: el bus de eventos en memoria (user.registered, user.updated) y un doble
 * del cliente, donde queda la marca de usuario suspendido que consulta el API Gateway.
 *
 * Base: TEST_DATABASE_URL. En local, la PostgreSQL de docker compose (docker compose up -d postgres).
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { verify, type JwtPayload } from 'jsonwebtoken';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { sha256 } from '../../src/auth/tokens';
import { InMemoryEventBus, RedisService } from '../../src/chassis';
import { PrismaService } from '../../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from '../test-utils';

const BASE_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5440/auth_db?schema=pruebas';
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

const JWT_SECRET = 'secreto-jwt-de-prueba';
const ADMIN_EMAIL = 'admin@ejemplo.test';
const ANA = { name: 'Ana Pérez', email: 'ana.perez@ejemplo.test', password: 'Clave1234' };

/** Valor de la cookie del refresh token (sl_refresh=...) tal como la guarda el navegador. */
const refreshCookie = (res: request.Response) => {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return cookies.find((c) => c.startsWith('sl_refresh='))!.split(';')[0];
};

describe('Auth Service · integración con PostgreSQL', () => {
  const admin = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let prisma: PrismaService;
  let anaId: string;
  let registerCookie: string;
  let csrfToken: string;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' });
    Object.assign(process.env, {
      DATABASE_URL: DB_URL,
      JWT_SECRET,
      ADMIN_EMAIL,
      ADMIN_PASSWORD: 'Admin-de-prueba-123',
      ADMIN_NAME: 'Administración de prueba',
    });
    ({ app, bus } = await createTestApp(AppModule));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await admin.$disconnect();
  });

  const http = () => request(app.getHttpServer());
  const login = (email: string, password: string) => http().post('/api/v1/auth/login').set(internalOnly).send({ email, password });

  it('al arrancar crea una sola vez la cuenta de administrador definida en ADMIN_EMAIL', async () => {
    await app.get(AuthService).ensureAdminAccount(); // una segunda réplica que arranca no la duplica
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    expect(admins).toEqual([expect.objectContaining({ email: ADMIN_EMAIL, status: 'ACTIVE' })]);
    expect(admins[0].passwordHash).toMatch(/^\$2[aby]\$10\$/); // bcrypt, nunca la contraseña en claro
  });

  it('registra a una organizadora: contraseña con bcrypt, refresh token solo como hash, cookie httpOnly y user.registered', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .set(internalOnly)
      .send({ ...ANA, email: 'Ana.Perez@Ejemplo.TEST' })
      .expect(201);
    anaId = res.body.user.id;
    csrfToken = res.body.csrfToken;
    registerCookie = refreshCookie(res);
    expect(res.body.refreshToken).toBeUndefined(); // en la web viaja solo en la cookie
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: anaId } });
    expect(user).toMatchObject({ email: ANA.email, role: 'ORGANIZER', status: 'ACTIVE' });
    expect(user.passwordHash).not.toContain(ANA.password);
    const rawToken = registerCookie.split('=')[1];
    await expect(prisma.refreshToken.findMany({ where: { userId: anaId } })).resolves.toEqual([
      expect.objectContaining({ tokenHash: sha256(rawToken), csrfHash: sha256(csrfToken), revokedAt: null }),
    ]);

    const claims = verify(res.body.accessToken, JWT_SECRET, { issuer: 'sportsleague-auth', audience: 'sportsleague' }) as JwtPayload;
    expect(claims).toMatchObject({ sub: anaId, role: 'ORGANIZER', email: ANA.email, name: ANA.name });
    expect(bus.published.find((e) => e.type === 'user.registered')?.data).toEqual({
      userId: anaId,
      email: ANA.email,
      name: ANA.name,
      role: 'ORGANIZER',
    });
  });

  it('responde 409 con un correo ya registrado (aunque cambien las mayúsculas) y 400 con una contraseña sin números', async () => {
    await http().post('/api/v1/auth/register').set(internalOnly).send({ ...ANA, email: 'ANA.PEREZ@ejemplo.test' }).expect(409);
    const weak = await http()
      .post('/api/v1/auth/register')
      .set(internalOnly)
      .send({ name: 'Pedro Díaz', email: 'pedro.diaz@ejemplo.test', password: 'solo-letras' })
      .expect(400);
    expect(weak.body.message).toContain('La contraseña debe combinar letras y números');
    await expect(prisma.user.count()).resolves.toBe(2);
  });

  it('inicia sesión con la contraseña correcta y responde lo mismo a una contraseña errónea que a un correo inexistente', async () => {
    const ok = await login(ANA.email, ANA.password).expect(200);
    expect(ok.body.user.lastLoginAt).toBeTruthy();
    const wrongPassword = await login(ANA.email, 'Clave9999').expect(401);
    const unknownEmail = await login('nadie@ejemplo.test', ANA.password).expect(401);
    expect(wrongPassword.body.message).toBe('Correo o contraseña incorrectos');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('rota el refresh token: sin el token CSRF responde 403; con él emite uno nuevo y revoca el anterior', async () => {
    await http().post('/api/v1/auth/refresh').set(internalOnly).set('Cookie', registerCookie).expect(403);

    const res = await http().post('/api/v1/auth/refresh').set(internalOnly).set('Cookie', registerCookie).set('x-csrf-token', csrfToken).expect(200);
    expect(res.body.accessToken).toBeTruthy();
    const nextCookie = refreshCookie(res);
    expect(nextCookie).not.toBe(registerCookie);

    const old = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(registerCookie.split('=')[1]) } });
    const next = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(nextCookie.split('=')[1]) } });
    expect(old.revokedAt).toBeInstanceOf(Date);
    expect(old.replacedBy).toBe(next.id);
    expect(next.revokedAt).toBeNull();
  });

  it('si reaparece un refresh token ya rotado (posible robo) cierra todas las sesiones del usuario', async () => {
    // Pasado el margen de 15 s para solicitudes simultáneas: se simula que la rotación fue hace un minuto.
    await prisma.refreshToken.update({
      where: { tokenHash: sha256(registerCookie.split('=')[1]) },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    const res = await http().post('/api/v1/auth/refresh').set(internalOnly).set('Cookie', registerCookie).set('x-csrf-token', csrfToken).expect(401);
    expect(res.body.message).toBe('Sesión inválida, inicia sesión de nuevo');
    await expect(prisma.refreshToken.count({ where: { userId: anaId, revokedAt: null } })).resolves.toBe(0);
  });

  it('el administrador suspende a la organizadora: revoca sus sesiones, avisa al gateway por Redis y ya no puede entrar', async () => {
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
    const ADMIN = asUser({ id: adminUser.id, role: 'ADMIN', email: ADMIN_EMAIL });
    await login(ANA.email, ANA.password).expect(200); // abre una sesión nueva antes de la suspensión

    await http().patch(`/api/v1/users/${anaId}`).set(asUser({ id: anaId, role: 'ORGANIZER' })).send({ status: 'SUSPENDED' }).expect(403);
    await http().patch(`/api/v1/users/${adminUser.id}`).set(ADMIN).send({ status: 'SUSPENDED' }).expect(400); // no a sí mismo
    await http().patch(`/api/v1/users/${anaId}`).set(ADMIN).send({ status: 'SUSPENDED' }).expect(200);

    await expect(prisma.user.findUnique({ where: { id: anaId } })).resolves.toMatchObject({ status: 'SUSPENDED' });
    await expect(prisma.refreshToken.count({ where: { userId: anaId, revokedAt: null } })).resolves.toBe(0);
    expect((app.get(RedisService).client as any)._store.get(`auth:suspended:${anaId}`)).toBe('1');
    expect(bus.published.find((e) => e.type === 'user.updated')?.data).toMatchObject({ userId: anaId, status: 'SUSPENDED', changedBy: adminUser.id });

    const blocked = await login(ANA.email, ANA.password).expect(403);
    expect(blocked.body.message).toBe('Tu cuenta está suspendida. Contacta al administrador.');
  });

  it('/metrics cuenta las peticiones de autenticación por ruta y código de respuesta', async () => {
    const res = await http().get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/register",status="201"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/register",status="409"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/register",status="400"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/login",status="200"} 2');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/login",status="401"} 2');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/login",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/refresh",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/refresh",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="POST",route="/api/v1/auth/refresh",status="401"} 1');
    expect(res.text).toContain('http_requests_total{method="PATCH",route="/api/v1/users/:id",status="200"} 1');
    expect(res.text).toContain('http_requests_total{method="PATCH",route="/api/v1/users/:id",status="403"} 1');
    expect(res.text).toContain('http_requests_total{method="PATCH",route="/api/v1/users/:id",status="400"} 1');
  });
});
