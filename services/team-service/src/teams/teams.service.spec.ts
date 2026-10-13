import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../chassis';
import { TeamsService } from './teams.service';

process.env.LOG_LEVEL = 'error';

const owner: AuthUser = { id: '11111111-1111-4111-8111-111111111111', role: 'ORGANIZER', email: 'org@liga.com', name: 'Org' };
const stranger: AuthUser = { id: '22222222-2222-4222-8222-222222222222', role: 'ORGANIZER', email: 'x@liga.com', name: 'X' };
const categoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const team = { id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt', name: 'Tigres', categoryId, leagueId: 'l', ownerId: owner.id };

function setup(range: { minAge: number | null; maxAge: number | null } | undefined) {
  const prisma = {
    team: {
      create: jest.fn(async ({ data }) => ({ id: team.id, ...data })),
      findUnique: jest.fn(async () => team),
    },
    player: { create: jest.fn(async ({ data }) => ({ id: 'p1', ...data })) },
  };
  const league = {
    category: jest.fn(async () => ({
      id: categoryId,
      name: 'Sub-17',
      minAge: 15,
      maxAge: 17,
      league: { id: 'l', name: 'Liga', sport: 'FOOTBALL', status: 'PENDING', ownerId: owner.id },
    })),
    venue: jest.fn(),
    ageRange: jest.fn(async () => range),
  };
  return { prisma, league, service: new TeamsService(prisma as any, league as any) };
}

describe('TeamsService', () => {
  it('solo el organizador dueño de la liga registra equipos', async () => {
    const { service } = setup({ minAge: 15, maxAge: 17 });
    await expect(service.create({ categoryId, name: 'Leones' }, stranger)).rejects.toBeInstanceOf(ForbiddenException);
    const created = await service.create({ categoryId, name: 'Leones' }, owner);
    expect(created.ownerId).toBe(owner.id);
    expect(created.color).toMatch(/^#/);
  });

  it('valida la elegibilidad automáticamente al fichar un jugador', async () => {
    const { service, prisma } = setup({ minAge: 15, maxAge: 17 });
    await service.addPlayer(team.id, { firstName: 'Juan', lastName: 'Pérez', birthDate: '1990-01-01' }, owner);
    expect(prisma.player.create.mock.calls[0][0].data.eligibilityStatus).toBe('INELIGIBLE');
  });

  it('deja al jugador pendiente cuando no se puede consultar la categoría', async () => {
    const { service, prisma } = setup(undefined);
    await service.addPlayer(team.id, { firstName: 'Ana', lastName: 'Ruiz', birthDate: '2010-01-01' }, owner);
    expect(prisma.player.create.mock.calls[0][0].data.eligibilityStatus).toBe('PENDING');
  });
});
