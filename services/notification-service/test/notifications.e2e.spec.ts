import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from './test-utils';

describe('Notification Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    notification: {
      findMany: jest.fn(async () => [{ id: 'n1', title: 'Hola', read: false }]),
      count: jest.fn(async () => 1),
    },
  };
  const me = { id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER', email: 'org@liga.com' };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('entrega la bandeja del usuario con el conteo de no leídas', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(asUser(me)).expect(200);
    expect(res.body).toEqual({ items: [{ id: 'n1', title: 'Hola', read: false }], unread: 1 });
  });

  it('no permite leer las notificaciones de otro usuario', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications/22222222-2222-4222-8222-222222222222')
      .set(asUser(me))
      .expect(403);
  });

  it('el registro de envíos es exclusivo del administrador', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications/deliveries').set(asUser(me)).expect(403);
    await request(app.getHttpServer()).get('/api/v1/notifications').set(internalOnly).expect(401);
  });
});
