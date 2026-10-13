import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from './test-utils';

describe('Fixture Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    match: { findMany: jest.fn(async () => [{ id: 'm1', status: 'SCHEDULED' }]) },
  };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el calendario público solo incluye calendarios publicados', async () => {
    await request(app.getHttpServer()).get('/api/v1/matches?status=SCHEDULED,LIVE').set(internalOnly).expect(200);
    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fixture: { status: 'PUBLISHED' }, status: { in: ['SCHEDULED', 'LIVE'] } }),
      }),
    );
  });

  it('valida los parámetros de generación', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/seasons/55555555-5555-4555-8555-555555555555/fixtures/generate')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' }))
      .send({ categoryId: 'no-es-uuid', minRestDays: 100 })
      .expect(400);
  });

  it('un aficionado no puede generar calendarios', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/seasons/55555555-5555-4555-8555-555555555555/fixtures/generate')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'SPECTATOR' }))
      .send({ categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })
      .expect(403);
  });
});
