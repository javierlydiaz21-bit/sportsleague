import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from './test-utils';

describe('League Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    league: {
      findMany: jest.fn(async () => [{ id: 'l1', name: 'Liga Pública', status: 'APPROVED' }]),
      create: jest.fn(async ({ data }) => ({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'PENDING', ...data })),
    },
  };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el listado público no requiere sesión', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/leagues').set(internalOnly).expect(200);
    expect(res.body[0].name).toBe('Liga Pública');
  });

  it('crear una liga requiere sesión y rol de organizador', async () => {
    await request(app.getHttpServer()).post('/api/v1/leagues').set(internalOnly).send({ name: 'Liga', sport: 'FOOTBALL' }).expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(asUser({ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', role: 'SPECTATOR' }))
      .send({ name: 'Liga', sport: 'FOOTBALL' })
      .expect(403);
  });

  it('valida el deporte y crea la liga en estado pendiente', async () => {
    const organizer = asUser({ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', role: 'ORGANIZER', name: 'José Pérez' });
    await request(app.getHttpServer()).post('/api/v1/leagues').set(organizer).send({ name: 'Liga', sport: 'TENIS' }).expect(400);
    const res = await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(organizer)
      .send({ name: 'Liga del Sinú', sport: 'FOOTBALL', city: 'Montería' })
      .expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.ownerName).toBe('José Pérez');
  });
});
