import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InMemoryEventBus, buildEnvelope, type AuthUser } from '../chassis';
import { FixturesService } from './fixtures.service';

process.env.LOG_LEVEL = 'error';

const owner: AuthUser = { id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER', email: 'org@liga.com', name: 'Org' };
const stranger: AuthUser = { id: '22222222-2222-4222-8222-222222222222', role: 'ORGANIZER', email: 'x@liga.com', name: 'X' };
const seasonId = '55555555-5555-4555-8555-555555555555';
const categoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function structure(status = 'APPROVED') {
  return {
    season: { id: seasonId, leagueId: 'L', name: 'Apertura', year: 2026, startDate: '2026-09-05T00:00:00.000Z', endDate: '2026-12-15T00:00:00.000Z' },
    league: { id: 'L', name: 'Liga', sport: 'FOOTBALL', status, ownerId: owner.id },
    categories: [{ id: categoryId, name: 'Libre', minAge: null, maxAge: null }],
    venues: [{ id: 'V1', name: 'Estadio', zone: 'Centro', availableDays: [6, 0], openTime: '08:00', closeTime: '18:00' }],
  };
}

function setup(options: { status?: string; teams?: number; existing?: unknown } = {}) {
  const teams = Array.from({ length: options.teams ?? 4 }, (_, i) => ({ id: `T${i + 1}`, name: `Equipo ${i + 1}`, categoryId, homeVenueId: null }));
  const created: any[] = [];
  const prisma: any = {
    fixture: {
      findUnique: jest.fn(async () => options.existing ?? null),
      create: jest.fn(async ({ data }) => {
        const fixture = { id: 'F1', status: 'DRAFT', ...data, matches: data.matches.create.map((m: any, i: number) => ({ id: `M${i}`, ...m })) };
        created.push(fixture);
        return fixture;
      }),
      delete: jest.fn(),
    },
    match: { updateMany: jest.fn(async () => ({ count: 1 })) },
  };
  prisma.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  const bus = new InMemoryEventBus();
  const league = { structure: jest.fn(async () => structure(options.status)) };
  const teamClient = { teamsOfCategory: jest.fn(async () => teams) };
  const service = new FixturesService(prisma, bus, league as any, teamClient as any);
  return { service, prisma, bus, created };
}

describe('FixturesService', () => {
  it('genera el calendario completo de la categoría en borrador', async () => {
    const { service } = setup({ teams: 4 });
    const fixture = await service.generate(seasonId, { categoryId, doubleRound: true, shuffle: false }, owner);
    expect(fixture.status).toBe('DRAFT');
    expect(fixture.totalRounds).toBe(6);
    expect(fixture.matches).toHaveLength(12);
    expect(fixture.matches[0].scheduledAt.toISOString()).toBe('2026-09-05T13:00:00.000Z'); // 08:00 en Colombia (UTC-5)
  });

  it('exige que la liga esté aprobada por el administrador', async () => {
    const { service } = setup({ status: 'PENDING' });
    await expect(service.generate(seasonId, { categoryId }, owner)).rejects.toBeInstanceOf(ConflictException);
  });

  it('solo el organizador de la liga genera el calendario', async () => {
    const { service } = setup();
    await expect(service.generate(seasonId, { categoryId }, stranger)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requiere al menos dos equipos', async () => {
    const { service } = setup({ teams: 1 });
    await expect(service.generate(seasonId, { categoryId }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no regenera un calendario ya publicado', async () => {
    const { service } = setup({ existing: { id: 'F0', status: 'PUBLISHED' } });
    await expect(service.generate(seasonId, { categoryId }, owner)).rejects.toBeInstanceOf(ConflictException);
  });

  it('actualiza el estado del partido de forma idempotente al recibir match.completed', async () => {
    const { service, prisma } = setup();
    await service.onMatchCompleted(buildEnvelope('match.completed', { matchId: 'M1', homeScore: 1, awayScore: 0 }));
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { id: 'M1', status: { in: ['SCHEDULED', 'LIVE'] } },
      data: { status: 'FINISHED' },
    });
  });
});
