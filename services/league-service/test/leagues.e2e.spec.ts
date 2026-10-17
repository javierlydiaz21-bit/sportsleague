import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp, internalOnly } from './test-utils';

const LEAGUE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OWNER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('League Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    league: {
      findMany: jest.fn(async () => [{ id: 'l1', name: 'Liga Pública', status: 'APPROVED' }]),
      create: jest.fn(async ({ data }) => ({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'PENDING', ...data })),
      findUnique: jest.fn(async () => ({ id: LEAGUE_ID, sport: 'FOOTBALL', ownerId: OWNER_ID })),
    },
    season: { findUnique: jest.fn(async () => ({ leagueId: LEAGUE_ID })) },
    category: { create: jest.fn(async ({ data }) => ({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ...data })) },
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

  it('POST /seasons/{id}/categories crea la categoría en la liga de la temporada', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/seasons/dddddddd-dddd-4ddd-8ddd-dddddddddddd/categories')
      .set(asUser({ id: OWNER_ID, role: 'ORGANIZER' }))
      .send({ name: 'Sub-17', minAge: 14, maxAge: 17 })
      .expect(201);
    expect(res.body).toMatchObject({ leagueId: LEAGUE_ID, name: 'Sub-17' });
    await request(app.getHttpServer())
      .post('/api/v1/seasons/dddddddd-dddd-4ddd-8ddd-dddddddddddd/categories')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' }))
      .send({ name: 'Sub-17' })
      .expect(403);
  });
});
