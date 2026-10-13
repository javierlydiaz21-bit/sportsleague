import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma } from './fake-prisma';
import { asUser, createTestApp, internalOnly } from './test-utils';

describe('Auth Service (HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prisma = createFakePrisma();
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rechaza solicitudes que no vienen del API Gateway', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({}).expect(401);
  });

  it('valida los datos de registro con mensajes en español', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set(internalOnly)
      .send({ name: 'A', email: 'no-es-correo', password: '123' })
      .expect(400);
    expect(res.body.message.join(' ')).toContain('correo');
  });

  it('registra, entrega cookie httpOnly y permite refrescar con CSRF', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set(internalOnly)
      .send({ name: 'Laura', email: 'laura@liga.com', password: 'Clave123' })
      .expect(201);
    expect(register.body.accessToken).toBeTruthy();
    expect(register.body.refreshToken).toBeUndefined();
    const cookie = register.headers['set-cookie'][0] as string;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');

    await request(app.getHttpServer()).post('/api/v1/auth/refresh').set(internalOnly).set('Cookie', cookie).expect(403);
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(internalOnly)
      .set('Cookie', cookie)
      .set('x-csrf-token', register.body.csrfToken)
      .expect(200);
    expect(refreshed.body.accessToken).toBeTruthy();
  });

  it('solo el administrador puede listar usuarios', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(asUser({ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', role: 'ORGANIZER' }))
      .expect(403);
  });

  it('expone el health check sin token interno', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
