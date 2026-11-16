import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

process.env.LOG_LEVEL = 'error';

const ADMIN = { id: '60000000-0000-4000-8000-000000000009', role: 'ADMIN' as const, email: 'admin@ejemplo.test', name: 'Administración' };
const ANA_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ana = (status: 'ACTIVE' | 'SUSPENDED') => ({
  id: ANA_ID,
  email: 'ana.perez@ejemplo.test',
  name: 'Ana Pérez',
  role: 'ORGANIZER',
  status,
  passwordHash: '$2a$10$hash-de-prueba',
  createdAt: new Date('2026-10-13T00:00:00Z'),
  lastLoginAt: null,
});

/** Prisma, Redis y el bus de eventos simulados con jest.fn(). */
function setup() {
  const prisma = {
    user: {
      findUnique: jest.fn(async () => ana('ACTIVE')),
      update: jest.fn(async ({ data }: { data: { status?: 'ACTIVE' | 'SUSPENDED' } }) => ana(data.status ?? 'ACTIVE')),
    },
    refreshToken: { updateMany: jest.fn(async () => ({ count: 2 })) },
  };
  const redis = { client: { set: jest.fn(async () => 'OK'), del: jest.fn(async () => 1) } };
  const bus = { publish: jest.fn(async () => undefined) };
  const service = new UsersService(prisma as any, redis as any, bus as any);
  return { service, prisma, redis, bus };
}

describe('UsersService (gestión de cuentas del administrador)', () => {
  it('suspender a un usuario revoca sus sesiones, lo marca en Redis para el gateway y publica user.updated', async () => {
    const { service, prisma, redis, bus } = setup();

    const updated = await service.update(ANA_ID, { status: 'SUSPENDED' }, ADMIN);

    expect(updated.status).toBe('SUSPENDED');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: ANA_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(redis.client.set).toHaveBeenCalledWith(`auth:suspended:${ANA_ID}`, '1', 'EX', 3600);
    expect(bus.publish).toHaveBeenCalledWith('user.updated', expect.objectContaining({ userId: ANA_ID, status: 'SUSPENDED', changedBy: ADMIN.id }));
    expect(updated).not.toHaveProperty('passwordHash'); // la respuesta nunca incluye el hash
  });

  it('reactivar a un usuario borra la marca de suspensión en Redis sin tocar sus sesiones', async () => {
    const { service, prisma, redis } = setup();

    await service.update(ANA_ID, { status: 'ACTIVE' }, ADMIN);

    expect(redis.client.del).toHaveBeenCalledWith(`auth:suspended:${ANA_ID}`);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('el administrador no puede cambiar su propio rol o estado', async () => {
    const { service, prisma, bus } = setup();

    await expect(service.update(ADMIN.id, { status: 'SUSPENDED' }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(bus.publish).not.toHaveBeenCalled();
  });
});
