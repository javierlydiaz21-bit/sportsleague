import { InMemoryEventBus, buildEnvelope } from '../chassis';
import { StatisticsService } from './statistics.service';

process.env.LOG_LEVEL = 'error';

const seasonId = '55555555-5555-4555-8555-555555555555';
const categoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function setup(rulesAvailable = true) {
  const results = new Map<string, any>();
  const tables: Record<string, any[]> = { standing: [], topScorer: [], disciplinaryRecord: [] };
  const table = (name: string) => ({
    deleteMany: jest.fn(async () => {
      tables[name] = [];
      return { count: 0 };
    }),
    createMany: jest.fn(async ({ data }) => {
      tables[name].push(...data);
      return { count: data.length };
    }),
    findMany: jest.fn(async () => tables[name]),
  });
  const prisma: any = {
    matchResult: {
      findUnique: jest.fn(async ({ where }) => results.get(where.matchId) ?? null),
      upsert: jest.fn(async ({ where, create }) => {
        results.set(where.matchId, create);
        return create;
      }),
      findMany: jest.fn(async () => [...results.values()]),
    },
    standing: table('standing'),
    topScorer: table('topScorer'),
    disciplinaryRecord: table('disciplinaryRecord'),
  };
  prisma.$transaction = jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));
  const cache = { get: jest.fn(async () => undefined), set: jest.fn(), del: jest.fn() };
  const upstream = {
    rules: jest.fn(async () => {
      if (!rulesAvailable) throw new Error('league-service caído');
      return { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakerCriteria: ['GOAL_DIFFERENCE'] };
    }),
  };
  const bus = new InMemoryEventBus();
  const service = new StatisticsService(prisma, bus, cache as any, upstream as any);
  return { service, bus, tables, results };
}

const completed = (version: number, homeScore: number, awayScore: number) =>
  buildEnvelope('match.completed', {
    matchId: 'M1',
    leagueId: 'L',
    seasonId,
    categoryId,
    ownerId: 'O',
    homeTeamId: 'A',
    awayTeamId: 'B',
    homeScore,
    awayScore,
    version,
    completedAt: '2026-09-05T15:00:00.000Z',
    events: [{ type: 'GOAL', teamId: 'A', playerId: 'p1', value: 1 }],
  });

describe('StatisticsService', () => {
  it('recalcula la tabla al recibir match.completed y avisa con standings.updated', async () => {
    const { service, bus, tables } = setup();
    await service.onMatchCompleted(completed(1, 1, 0));
    expect(tables.standing.map((r) => [r.teamId, r.points])).toEqual([
      ['A', 3],
      ['B', 0],
    ]);
    expect(tables.topScorer[0]).toMatchObject({ playerId: 'p1', goals: 1 });
    expect(bus.published.map((e) => e.type)).toContain('standings.updated');
  });

  it('procesar el mismo evento dos veces no duplica efectos (idempotencia)', async () => {
    const { service, tables } = setup();
    await service.onMatchCompleted(completed(1, 1, 0));
    await service.onMatchCompleted(completed(1, 1, 0));
    expect(tables.standing.find((r) => r.teamId === 'A')).toMatchObject({ played: 1, points: 3 });
  });

  it('aplica la corrección del acta e ignora versiones antiguas', async () => {
    const { service, tables } = setup();
    await service.onMatchCompleted(completed(1, 1, 0));
    await service.onMatchCompleted(completed(2, 1, 1)); // corrección: empate
    await service.onMatchCompleted(completed(1, 1, 0)); // llega tarde la versión vieja
    expect(tables.standing.find((r) => r.teamId === 'A')).toMatchObject({ draws: 1, points: 1 });
  });

  it('si el League Service no responde usa el reglamento estándar', async () => {
    const { service, tables } = setup(false);
    await service.onMatchCompleted(completed(1, 2, 0));
    expect(tables.standing[0]).toMatchObject({ teamId: 'A', points: 3 });
  });
});
