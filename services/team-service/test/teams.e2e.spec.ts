import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from './test-utils';

describe('Team Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    team: { findMany: jest.fn(async () => [{ id: 't1', name: 'Tigres', _count: { players: 11 } }]) },
  };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lista equipos de una categoría sin necesidad de sesión', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/teams?categoryId=cccccccc-cccc-4ccc-8ccc-cccccccccccc')
      .set(internalOnly)
      .expect(200);
    expect(res.body[0].name).toBe('Tigres');
  });

  it('exige un filtro al listar equipos', async () => {
    await request(app.getHttpServer()).get('/api/v1/teams').set(internalOnly).expect(400);
  });

  it('valida los datos del jugador', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/teams/99999999-9999-4999-8999-999999999999/players')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' }))
      .send({ firstName: 'J' })
      .expect(400);
  });
});
