import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InMemoryEventBus, type AuthUser } from '../chassis';
import { LiveService } from './live.service';

process.env.LOG_LEVEL = 'error';

const ownerId = '11111111-1111-4111-8111-111111111111';
const owner: AuthUser = { id: ownerId, role: 'ORGANIZER', email: 'org@liga.com', name: 'Org' };
const referee: AuthUser = { id: '22222222-2222-4222-8222-222222222222', role: 'REFEREE', email: 'ref@liga.com', name: 'Ref' };
const intruder: AuthUser = { id: '33333333-3333-4333-8333-333333333333', role: 'REFEREE', email: 'otro@liga.com', name: 'Otro' };
const matchId = '44444444-4444-4444-8444-444444444444';
const HOME = '55555555-5555-4555-8555-555555555555';
const AWAY = '66666666-6666-4666-8666-666666666666';

function setup() {
  const live = {
    matchId,
    leagueId: 'L',
    seasonId: 'S',
    categoryId: 'C',
    ownerId,
    homeTeamId: HOME,
    awayTeamId: AWAY,
    status: 'LIVE',
    peakViewers: 0,
    finishedAt: null,
    attendance: null,
    version: 0,
  };
  const events: any[] = [];
  const prisma: any = {
    liveMatch: {
      findUnique: jest.fn(async ({ include }) => (include ? { ...live, events } : live)),
      update: jest.fn(async ({ data, include }) => {
        if (data.version?.increment) live.version += 1;
        Object.assign(live, { ...data, version: live.version });
        return include ? { ...live, events } : live;
      }),
    },
    matchEvent: {
      create: jest.fn(async ({ data }) => {
        const row = { id: `E${events.length + 1}`, createdAt: new Date(), ...data };
        events.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }) => events.filter((e) => !where.type || e.type === where.type)),
    },
  };
  const cache = { get: jest.fn(async () => ({ [HOME]: ['P1'], [AWAY]: ['P2'] })), set: jest.fn() };
  const upstream = { refereeAssigned: jest.fn(async (_m: string, email: string) => ({ assigned: email === referee.email })) };
  const viewers = { peak: jest.fn(async () => 42), count: jest.fn(async () => 3) };
  const bus = new InMemoryEventBus();
  const service = new LiveService(prisma, bus, cache as any, upstream as any, viewers as any);
  return { service, bus, live, events };
}

describe('LiveService', () => {
  it('el árbitro asignado registra un gol, se calcula el marcador y se publica match.event', async () => {
    const { service, bus } = setup();
    const result = await service.addEvent(matchId, { type: 'GOAL', teamId: HOME, playerId: 'P1', minute: 12 }, referee);
    expect(result.score).toEqual({ home: 1, away: 0 });
    expect(bus.published[0]).toMatchObject({ type: 'match.event', data: { matchId, type: 'GOAL', score: { home: 1, away: 0 } } });
  });

  it('un árbitro no asignado no puede modificar el marcador', async () => {
    const { service } = setup();
    await expect(service.addEvent(matchId, { type: 'GOAL', teamId: HOME, minute: 12 }, intruder)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza equipos que no juegan el partido y jugadores fuera de la plantilla', async () => {
    const { service } = setup();
    await expect(
      service.addEvent(matchId, { type: 'GOAL', teamId: '77777777-7777-4777-8777-777777777777', minute: 1 }, owner),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addEvent(matchId, { type: 'GOAL', teamId: HOME, playerId: 'P2', minute: 1 }, owner)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('al finalizar publica el acta (match.completed) con el marcador y la versión', async () => {
    const { service, bus } = setup();
    await service.addEvent(matchId, { type: 'GOAL', teamId: AWAY, playerId: 'P2', minute: 30 }, owner);
    await service.complete(matchId, { attendance: 150 }, owner);
    const completed = bus.published.find((e) => e.type === 'match.completed');
    expect(completed?.data).toMatchObject({ homeScore: 0, awayScore: 1, version: 1, reason: 'final', attendance: 150 });
  });

  it('una corrección posterior al cierre republica el acta con una nueva versión', async () => {
    const { service, bus, live } = setup();
    await service.complete(matchId, {}, owner);
    live.status = 'FINISHED';
    await service.addEvent(matchId, { type: 'GOAL', teamId: HOME, playerId: 'P1', minute: 88 }, owner);
    const actas = bus.published.filter((e) => e.type === 'match.completed');
    expect(actas.map((e) => (e.data as any).version)).toEqual([1, 2]);
    expect((actas[1].data as any).reason).toBe('correction');
  });
});
