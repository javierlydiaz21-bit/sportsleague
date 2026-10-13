import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, internalOnly } from './test-utils';

describe('Statistics Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    standing: { findMany: jest.fn(async () => [{ teamId: 't1', position: 1, points: 9 }]) },
  };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('la tabla de posiciones es pública y se sirve desde la caché tras la primera consulta', async () => {
    const url = '/api/v1/standings/55555555-5555-4555-8555-555555555555?categoryId=cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const first = await request(app.getHttpServer()).get(url).set(internalOnly).expect(200);
    expect(first.body[0]).toMatchObject({ position: 1, points: 9 });
    await request(app.getHttpServer()).get(url).set(internalOnly).expect(200);
    expect(prisma.standing.findMany).toHaveBeenCalledTimes(1);
  });

  it('recalcular manualmente requiere sesión', async () => {
    await request(app.getHttpServer()).post('/api/v1/statistics/recalculate').set(internalOnly).send({}).expect(401);
  });
});
