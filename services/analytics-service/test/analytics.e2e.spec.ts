import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { asUser, createTestApp } from './test-utils';

process.env.ETL_DISABLED = 'true';

describe('Analytics Service (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    leagueKpi: {
      findMany: jest.fn(async () => [{ leagueId: 'l1', ownerId: 'o1', totalMatches: 10, finished: 4, suspended: 1, live: 0, scheduled: 5, totalGoals: 12, totalCards: 3 }]),
      findUnique: jest.fn(async () => ({ leagueId: 'l1', ownerId: '11111111-1111-4111-8111-111111111111', computedAt: new Date() })),
    },
    etlRun: { findMany: jest.fn(async () => []) },
    attendanceEstimate: {
      aggregate: jest.fn(async () => ({ _sum: { estimatedAttendance: 800 }, _avg: { estimatedAttendance: 200 } })),
      findMany: jest.fn(async () => []),
    },
    suspendedMatch: { findMany: jest.fn(async () => []) },
  };

  beforeAll(async () => {
    ({ app } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el resumen global es exclusivo del administrador', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/analytics/overview')
      .set(asUser({ id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER' }))
      .expect(403);
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/overview')
      .set(asUser({ id: '33333333-3333-4333-8333-333333333333', role: 'ADMIN' }))
      .expect(200);
    expect(res.body.totals).toMatchObject({ matches: 10, finished: 4, goals: 12, avgGoalsPerMatch: 3, totalAttendance: 800 });
  });

  it('un organizador no ve la analítica de una liga ajena', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/analytics/leagues/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .set(asUser({ id: '22222222-2222-4222-8222-222222222222', role: 'ORGANIZER' }))
      .expect(403);
  });
});
