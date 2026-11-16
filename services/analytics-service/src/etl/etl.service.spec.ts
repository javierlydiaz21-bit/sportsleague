import { EtlService } from './etl.service';

process.env.LOG_LEVEL = 'error';

// Réplicas de solo lectura simuladas: cada consulta del ETL pasa por este mock de pg.Pool.
const replicaQuery = jest.fn();
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({ query: replicaQuery, end: jest.fn(async () => undefined) })),
}));

const LEAGUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MATCH = '30000000-0000-4000-8000-000000000001';

/** Filas que devolvería cada réplica según la tabla consultada. */
function replicaRows(sql: string) {
  if (sql.includes('FROM matches')) {
    return [
      {
        id: MATCH,
        league_id: LEAGUE,
        season_id: 'S',
        category_id: 'C',
        owner_id: 'O',
        status: 'FINISHED',
        scheduled_at: new Date('2027-03-06T20:00:00Z'),
        suspension_reason: null,
        home_team_id: 'A',
        away_team_id: 'B',
      },
    ];
  }
  if (sql.includes('FROM live_matches')) return [{ match_id: MATCH, status: 'FINISHED', attendance: 300, peak_viewers: 40 }];
  if (sql.includes('FROM match_events')) return [{ match_id: MATCH, type: 'GOAL', value: 1 }];
  return [];
}

function setup(lock: 'OK' | null = 'OK') {
  const prisma: any = {
    etlRun: {
      create: jest.fn(async ({ data }) => ({ id: 'run-1', ...data })),
      update: jest.fn(async ({ data }) => ({ id: 'run-1', trigger: 'manual', ...data })),
    },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };
  for (const table of ['attendanceEstimate', 'suspendedMatch', 'teamPerformanceTrend', 'leagueKpi']) {
    prisma[table] = { deleteMany: jest.fn(() => `${table}.deleteMany`), createMany: jest.fn(({ data }) => data) };
  }
  const redis = { client: { set: jest.fn(async () => lock), del: jest.fn(async () => 1) } };
  return { service: new EtlService(prisma, redis as any), prisma, redis };
}

describe('EtlService (ETL sobre réplicas de solo lectura)', () => {
  beforeAll(() => {
    process.env.FIXTURE_REPLICA_URL = 'postgresql://analytics_ro:ro@replica/fixture_db';
    process.env.LIVESCORE_REPLICA_URL = 'postgresql://analytics_ro:ro@replica/livescore_db';
    process.env.STATISTICS_REPLICA_URL = 'postgresql://analytics_ro:ro@replica/statistics_db';
  });

  beforeEach(() => {
    replicaQuery.mockReset();
  });

  it('extrae de las réplicas, carga las tablas en una sola transacción y marca la corrida SUCCESS', async () => {
    replicaQuery.mockImplementation(async (sql: string) => ({ rows: replicaRows(sql) }));
    const { service, prisma, redis } = setup();

    const run = await service.run('manual');

    expect(replicaQuery).toHaveBeenCalledTimes(4); // partidos, partidos en vivo, eventos y actas
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.leagueKpi.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ leagueId: LEAGUE, totalMatches: 1, finished: 1, totalGoals: 1, avgAttendance: 300 })],
    });
    expect(run).toMatchObject({ status: 'SUCCESS', rowsProcessed: 3 });
    expect(redis.client.del).toHaveBeenCalledWith('analytics:etl-lock'); // libera el candado al terminar
  });

  it('si una réplica no responde registra la corrida FAILED y no toca las tablas analíticas', async () => {
    replicaQuery.mockRejectedValue(new Error('connection refused'));
    const { service, prisma, redis } = setup();

    const run = await service.run('schedule');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(run).toMatchObject({ status: 'FAILED', error: 'connection refused' });
    expect(redis.client.del).toHaveBeenCalledWith('analytics:etl-lock');
  });

  it('no ejecuta el ETL si otra instancia tiene el candado de Redis', async () => {
    const { service, prisma } = setup(null);

    await expect(service.run('schedule')).resolves.toEqual({ skipped: true, reason: 'Otra instancia está ejecutando el ETL' });
    expect(prisma.etlRun.create).not.toHaveBeenCalled();
    expect(replicaQuery).not.toHaveBeenCalled();
  });
});
