import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EventBus, RedisService, log, type AuthUser } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../auth/auth.service';
import { ListUsersQuery, UpdateUserDto } from './dto';

/** Clave que consulta el API Gateway para bloquear al instante a un usuario suspendido. */
export const SUSPENDED_KEY = (userId: string) => `auth:suspended:${userId}`;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly bus: EventBus,
  ) {}

  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(toPublicUser), total, page, limit };
  }

  async stats() {
    const [byRole, byStatus, lastWeek] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    ]);
    const roles = Object.fromEntries(byRole.map((row) => [row.role, row._count._all]));
    const statuses = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
    const total = byRole.reduce((sum, row) => sum + row._count._all, 0);
    return { total, byRole: roles, byStatus: statuses, registeredLast7Days: lastWeek };
  }

  async update(id: string, dto: UpdateUserDto, admin: AuthUser) {
    if (id === admin.id && (dto.role || dto.status)) {
      throw new BadRequestException('No puedes cambiar tu propio rol o estado');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...(dto.role ? { role: dto.role } : {}), ...(dto.status ? { status: dto.status } : {}) },
    });

    if (dto.status === 'SUSPENDED') {
      await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.redis.client.set(SUSPENDED_KEY(id), '1', 'EX', 3600).catch(() => undefined);
    } else if (dto.status === 'ACTIVE') {
      await this.redis.client.del(SUSPENDED_KEY(id)).catch(() => undefined);
    }

    log.info('user_updated_by_admin', { targetUserId: id, adminId: admin.id, role: dto.role, status: dto.status });
    await this.bus.publish('user.updated', {
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      changedBy: admin.id,
    });
    return toPublicUser(updated);
  }
}
