import { InMemoryEventBus, buildEnvelope } from '../chassis';
import { RefereesService } from './referees.service';

process.env.LOG_LEVEL = 'error';

const ownerId = '11111111-1111-4111-8111-111111111111';

function setup(referees: any[]) {
  const projections = new Map<string, any>();
  const assignments: any[] = [];
  const prisma: any = {
    scheduledMatch: {
      upsert: jest.fn(async ({ where, create }) => {
        const row = projections.get(where.matchId) ?? { ...create, status: 'SCHEDULED' };
        projections.set(where.matchId, row);
        return row;
      }),
    },
    refereeAssignment: {
      findFirst: jest.fn(async ({ where }) => assignments.find((a) => a.matchId === where.matchId && a.status !== 'DECLINED') ?? null),
      findMany: jest.fn(async ({ where }) =>
        assignments.filter((a) => (where.matchId ? a.matchId === where.matchId && a.status === where.status : a.status !== 'DECLINED')),
      ),
      upsert: jest.fn(async ({ create }) => {
        const row = { id: `A${assignments.length + 1}`, status: 'ASSIGNED', ...create };
        assignments.push(row);
        return row;
      }),
    },
    referee: { findMany: jest.fn(async () => referees) },
  };
  const bus = new InMemoryEventBus();
  const service = new RefereesService(prisma, bus);
  return { service, bus, assignments };
}

const weekendReferee = (id: string, zone: string) => ({
  id,
  name: id,
  email: `${id}@liga.com`,
  ownerId,
  leagueId: null,
  zone,
  categoriesCertified: [],
  active: true,
  availability: [{ dayOfWeek: 6, startTime: '07:00', endTime: '20:00' }],
});

const published = (matches: { matchId: string; scheduledAt: string; venueZone: string }[]) =>
  buildEnvelope('fixture.published', {
    leagueId: 'L1',
    leagueName: 'Liga',
    categoryId: 'C1',
    ownerId,
    round: 1,
    matches: matches.map((m) => ({ ...m, homeTeamName: 'Tigres', awayTeamName: 'Leones', venueName: 'Estadio' })),
  });

describe('RefereesService (consumidor de fixture.published)', () => {
  it('asigna automáticamente al árbitro de la misma zona y publica referee.assigned', async () => {
    const { service, bus, assignments } = setup([weekendReferee('centro', 'Centro'), weekendReferee('norte', 'Norte')]);
    await service.onFixturePublished(published([{ matchId: 'M1', scheduledAt: '2026-09-05T15:00:00.000Z', venueZone: 'Norte' }]));
    expect(assignments).toHaveLength(1);
    expect(assignments[0].refereeId).toBe('norte');
    expect(bus.published.map((e) => e.type)).toEqual(['referee.assigned']);
  });

  it('no asigna dos veces el mismo partido si el evento se repite (idempotencia)', async () => {
    const { service, assignments } = setup([weekendReferee('centro', 'Centro')]);
    const event = published([{ matchId: 'M1', scheduledAt: '2026-09-05T15:00:00.000Z', venueZone: 'Centro' }]);
    await service.onFixturePublished(event);
    await service.onFixturePublished(event);
    expect(assignments).toHaveLength(1);
  });

  it('avisa con referee.unassigned cuando nadie está disponible', async () => {
    const { service, bus } = setup([weekendReferee('centro', 'Centro')]);
    // Domingo: el árbitro solo trabaja los sábados.
    await service.onFixturePublished(published([{ matchId: 'M2', scheduledAt: '2026-09-06T15:00:00.000Z', venueZone: 'Centro' }]));
    expect(bus.published.map((e) => e.type)).toEqual(['referee.unassigned']);
  });
});
