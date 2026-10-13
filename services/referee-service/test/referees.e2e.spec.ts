import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from './test-utils';

describe('Referee Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    refereeAssignment: {
      findFirst: jest.fn(async () => ({ id: 'a1', referee: { name: 'Mario Arroyo' } })),
    },
  };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde la verificación interna de asignación', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/internal/assignments/check?matchId=55555555-5555-4555-8555-555555555555&email=mario@liga.com')
      .set(internalOnly)
      .expect(200);
    expect(res.body).toEqual({ assigned: true, refereeName: 'Mario Arroyo' });
  });

  it('valida la disponibilidad al registrar un árbitro', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/referees')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' }))
      .send({ name: 'Ana', email: 'ana@liga.com', zone: 'Norte', availability: [{ dayOfWeek: 9, startTime: '7', endTime: '20:00' }] })
      .expect(400);
  });

  it('solo organizadores registran árbitros', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/referees')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'REFEREE' }))
      .send({ name: 'Ana', email: 'ana@liga.com', zone: 'Norte', availability: [] })
      .expect(403);
  });
});
