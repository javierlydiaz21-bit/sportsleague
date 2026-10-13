import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InMemoryEventBus, type AuthUser } from '../chassis';
import { LeaguesService } from './leagues.service';

process.env.LOG_LEVEL = 'error';

const owner: AuthUser = { id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER', email: 'org@liga.com', name: 'Org' };
const stranger: AuthUser = { id: '22222222-2222-4222-8222-222222222222', role: 'ORGANIZER', email: 'x@liga.com', name: 'X' };
const admin: AuthUser = { id: '33333333-3333-4333-8333-333333333333', role: 'ADMIN', email: 'admin@liga.com', name: 'Admin' };

function league(overrides: Record<string, unknown> = {}) {
  return { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Liga', sport: 'FOOTBALL', status: 'PENDING', ownerId: owner.id, ...overrides };
}

function prismaMock() {
  return {
    league: {
      create: jest.fn(async ({ data }) => ({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'PENDING', ...data })),
      findUnique: jest.fn(),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data }) => ({ ...league(), ...data })),
    },
    category: { create: jest.fn(async ({ data }) => ({ id: 'cat', ...data })) },
    season: { create: jest.fn(async ({ data }) => ({ id: 'season', ...data })) },
  };
}

describe('LeaguesService', () => {
  let prisma: ReturnType<typeof prismaMock>;
  let bus: InMemoryEventBus;
  let service: LeaguesService;

  beforeEach(() => {
    prisma = prismaMock();
    bus = new InMemoryEventBus();
    service = new LeaguesService(prisma as any, bus);
  });

  it('crea la liga pendiente de aprobación y avisa con league.created', async () => {
    const created = await service.create({ name: ' Liga Sinú ', sport: 'FOOTBALL' }, owner);
    expect(created.name).toBe('Liga Sinú');
    expect(created.ownerId).toBe(owner.id);
    expect(bus.published[0]).toMatchObject({ type: 'league.created', data: { ownerId: owner.id } });
  });

  it('el administrador aprueba la liga y se publica league.reviewed', async () => {
    prisma.league.findUnique.mockResolvedValue(league());
    const updated = await service.review(league().id, { status: 'APPROVED' }, admin);
    expect(updated.status).toBe('APPROVED');
    expect(bus.published[0]).toMatchObject({ type: 'league.reviewed', data: { status: 'APPROVED', ownerId: owner.id } });
  });

  it('no permite transiciones de revisión inválidas', async () => {
    prisma.league.findUnique.mockResolvedValue(league({ status: 'APPROVED' }));
    await expect(service.review(league().id, { status: 'REJECTED' }, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('oculta las ligas pendientes a quien no es dueño ni admin', async () => {
    prisma.league.findUnique.mockResolvedValue({ ...league(), seasons: [], categories: [], venues: [] });
    await expect(service.get(league().id, stranger)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get(league().id, owner)).resolves.toBeTruthy();
    await expect(service.get(league().id, admin)).resolves.toBeTruthy();
  });

  it('solo el admin puede listar ligas pendientes', async () => {
    await expect(service.list({ status: 'PENDING' }, owner)).rejects.toBeInstanceOf(ForbiddenException);
    await service.list({ status: 'PENDING' }, admin);
    expect(prisma.league.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }));
  });

  it('impide que otro organizador agregue categorías y aplica el reglamento por defecto', async () => {
    prisma.league.findUnique.mockResolvedValue(league());
    await expect(service.addCategory(league().id, { name: 'Libre' }, stranger)).rejects.toBeInstanceOf(ForbiddenException);
    await service.addCategory(league().id, { name: 'Libre', minAge: 16, maxAge: 40 }, owner);
    const data = prisma.category.create.mock.calls[0][0].data;
    expect(data.rules.create).toMatchObject({ pointsWin: 3, pointsDraw: 1 });
  });

  it('valida rangos de edad y fechas de temporada', async () => {
    prisma.league.findUnique.mockResolvedValue(league());
    await expect(service.addCategory(league().id, { name: 'Sub-17', minAge: 18, maxAge: 17 }, owner)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.addSeason(league().id, { name: 'Apertura', year: 2026, startDate: '2026-10-01', endDate: '2026-09-01' }, owner),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
