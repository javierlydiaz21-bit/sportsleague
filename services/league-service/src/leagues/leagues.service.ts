import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { League, Prisma } from '@prisma/client';
import { EventBus, assertOwnerOrAdmin, isAdmin, isOwnerOrAdmin, log, type AuthUser } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto,
  CreateLeagueDto,
  CreateSeasonDto,
  CreateVenueDto,
  ListLeaguesQuery,
  ReviewLeagueDto,
  RulesDto,
  UpdateCategoryDto,
  UpdateLeagueDto,
  UpdateSeasonDto,
  UpdateVenueDto,
} from './dto';
import { canTransition, defaultRules, minutesOf, toDateOnly } from './rules';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DETAIL_INCLUDE = {
  seasons: { orderBy: { startDate: 'desc' } },
  categories: { orderBy: { name: 'asc' }, include: { rules: true } },
  venues: { orderBy: { name: 'asc' } },
} satisfies Prisma.LeagueInclude;

const COUNTS = { _count: { select: { seasons: true, categories: true, venues: true } } } satisfies Prisma.LeagueInclude;

@Injectable()
export class LeaguesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
  ) {}

  // ---------- Ligas ----------

  async create(dto: CreateLeagueDto, user: AuthUser) {
    const league = await this.prisma.league.create({
      data: {
        name: dto.name.trim(),
        sport: dto.sport,
        description: dto.description?.trim() || null,
        city: dto.city?.trim() || null,
        ownerId: user.id,
        ownerName: user.name || user.email,
      },
    });
    log.info('league_created', { leagueId: league.id });
    await this.bus.publish('league.created', {
      leagueId: league.id,
      name: league.name,
      sport: league.sport,
      ownerId: league.ownerId,
      ownerName: league.ownerName,
    });
    return league;
  }

  /** Listado público: solo ligas aprobadas. El administrador puede ver cualquier estado. */
  async list(query: ListLeaguesQuery, user?: AuthUser) {
    const admin = isAdmin(user);
    if (query.status && query.status !== 'APPROVED' && !admin) {
      throw new ForbiddenException('Solo el administrador puede consultar ligas en ese estado');
    }
    const ids = query.ids
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id));
    const where: Prisma.LeagueWhereInput = {
      ...(admin ? (query.status ? { status: query.status } : {}) : { status: 'APPROVED' }),
      ...(query.sport ? { sport: query.sport } : {}),
      ...(ids?.length ? { id: { in: ids } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { city: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.league.findMany({
      where,
      include: COUNTS,
      orderBy: [{ createdAt: 'desc' }],
      take: query.limit ?? 50,
    });
  }

  mine(user: AuthUser) {
    return this.prisma.league.findMany({
      where: { ownerId: user.id },
      include: COUNTS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async stats() {
    const rows = await this.prisma.league.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
    return {
      total: rows.reduce((sum, row) => sum + row._count._all, 0),
      byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0, SUSPENDED: 0, ...byStatus },
    };
  }

  async get(id: string, user?: AuthUser) {
    const league = await this.prisma.league.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!league || !this.canView(league, user)) throw new NotFoundException('Liga no encontrada');
    return league;
  }

  async update(id: string, dto: UpdateLeagueDto, user: AuthUser) {
    await this.ownedLeague(id, user);
    return this.prisma.league.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    const league = await this.ownedLeague(id, user);
    if (league.status === 'APPROVED' && !isAdmin(user)) {
      throw new ConflictException('Una liga aprobada no se puede eliminar; solicita al administrador que la suspenda');
    }
    await this.prisma.league.delete({ where: { id } });
    log.info('league_deleted', { leagueId: id });
    return { ok: true };
  }

  /** Revisión del administrador: aprobar, rechazar o suspender una liga. */
  async review(id: string, dto: ReviewLeagueDto, admin: AuthUser) {
    const league = await this.prisma.league.findUnique({ where: { id } });
    if (!league) throw new NotFoundException('Liga no encontrada');
    if (!canTransition(league.status, dto.status)) {
      throw new ConflictException(`No se puede pasar una liga de ${league.status} a ${dto.status}`);
    }
    const updated = await this.prisma.league.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.note?.trim() || null, reviewedBy: admin.id, reviewedAt: new Date() },
    });
    log.info('league_reviewed', { leagueId: id, status: dto.status, adminId: admin.id });
    await this.bus.publish('league.reviewed', {
      leagueId: updated.id,
      name: updated.name,
      ownerId: updated.ownerId,
      status: updated.status,
      note: updated.reviewNote,
      reviewedBy: admin.id,
    });
    return updated;
  }

  // ---------- Temporadas ----------

  async addSeason(leagueId: string, dto: CreateSeasonDto, user: AuthUser) {
    await this.ownedLeague(leagueId, user);
    const startDate = toDateOnly(dto.startDate);
    const endDate = toDateOnly(dto.endDate);
    if (startDate >= endDate) throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    return this.prisma.season.create({ data: { leagueId, name: dto.name.trim(), year: dto.year, startDate, endDate } });
  }

  async getSeason(id: string, user?: AuthUser) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: { league: { include: { categories: { include: { rules: true }, orderBy: { name: 'asc' } } } } },
    });
    if (!season || !this.canView(season.league, user)) throw new NotFoundException('Temporada no encontrada');
    return season;
  }

  async updateSeason(id: string, dto: UpdateSeasonDto, user: AuthUser) {
    const season = await this.prisma.season.findUnique({ where: { id }, include: { league: true } });
    if (!season) throw new NotFoundException('Temporada no encontrada');
    assertOwnerOrAdmin(user, season.league.ownerId);
    const startDate = dto.startDate ? toDateOnly(dto.startDate) : season.startDate;
    const endDate = dto.endDate ? toDateOnly(dto.endDate) : season.endDate;
    if (startDate >= endDate) throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    return this.prisma.season.update({
      where: { id },
      data: { ...(dto.name ? { name: dto.name.trim() } : {}), startDate, endDate },
    });
  }

  // ---------- Categorías y reglamento ----------

  async addCategory(leagueId: string, dto: CreateCategoryDto, user: AuthUser) {
    const league = await this.ownedLeague(leagueId, user);
    this.assertAgeRange(dto.minAge, dto.maxAge);
    const rules = dto.rules ?? defaultRules(league.sport);
    return this.prisma.category.create({
      data: {
        leagueId,
        name: dto.name.trim(),
        minAge: dto.minAge ?? null,
        maxAge: dto.maxAge ?? null,
        rules: { create: { ...rules } },
      },
      include: { rules: true },
    });
  }

  async addCategoryToSeason(seasonId: string, dto: CreateCategoryDto, user: AuthUser) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId }, select: { leagueId: true } });
    if (!season) throw new NotFoundException('Temporada no encontrada');
    return this.addCategory(season.leagueId, dto, user);
  }

  async getCategory(id: string, user?: AuthUser) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        rules: true,
        league: { select: { id: true, name: true, sport: true, status: true, ownerId: true } },
      },
    });
    if (!category || !this.canView(category.league, user)) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, user: AuthUser) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { league: true } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    assertOwnerOrAdmin(user, category.league.ownerId);
    const minAge = dto.minAge !== undefined ? dto.minAge : category.minAge;
    const maxAge = dto.maxAge !== undefined ? dto.maxAge : category.maxAge;
    this.assertAgeRange(minAge ?? undefined, maxAge ?? undefined);
    return this.prisma.category.update({
      where: { id },
      data: { ...(dto.name ? { name: dto.name.trim() } : {}), minAge, maxAge },
      include: { rules: true },
    });
  }

  async getRules(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { rules: true, league: { select: { sport: true } } },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return { categoryId, ...(category.rules ?? defaultRules(category.league.sport)) };
  }

  /** Cambiar el reglamento dispara el recálculo idempotente de la tabla (rules.updated). */
  async updateRules(categoryId: string, dto: RulesDto, user: AuthUser) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId }, include: { league: true } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    assertOwnerOrAdmin(user, category.league.ownerId);
    const rules = await this.prisma.rule.upsert({
      where: { categoryId },
      create: { categoryId, ...dto },
      update: { ...dto },
    });
    await this.bus.publish('rules.updated', { categoryId, leagueId: category.leagueId });
    return rules;
  }

  // ---------- Canchas ----------

  async addVenue(leagueId: string, dto: CreateVenueDto, user: AuthUser) {
    await this.ownedLeague(leagueId, user);
    this.assertHours(dto.openTime, dto.closeTime);
    return this.prisma.venue.create({
      data: {
        leagueId,
        name: dto.name.trim(),
        address: dto.address?.trim() || null,
        zone: dto.zone.trim(),
        availableDays: [...new Set(dto.availableDays)].sort(),
        openTime: dto.openTime,
        closeTime: dto.closeTime,
      },
    });
  }

  async getVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { league: { select: { id: true, name: true, ownerId: true, status: true } } },
    });
    if (!venue) throw new NotFoundException('Cancha no encontrada');
    return venue;
  }

  async updateVenue(id: string, dto: UpdateVenueDto, user: AuthUser) {
    const venue = await this.prisma.venue.findUnique({ where: { id }, include: { league: true } });
    if (!venue) throw new NotFoundException('Cancha no encontrada');
    assertOwnerOrAdmin(user, venue.league.ownerId);
    this.assertHours(dto.openTime ?? venue.openTime, dto.closeTime ?? venue.closeTime);
    return this.prisma.venue.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.zone ? { zone: dto.zone.trim() } : {}),
        ...(dto.availableDays ? { availableDays: [...new Set(dto.availableDays)].sort() } : {}),
        ...(dto.openTime ? { openTime: dto.openTime } : {}),
        ...(dto.closeTime ? { closeTime: dto.closeTime } : {}),
      },
    });
  }

  async removeVenue(id: string, user: AuthUser) {
    const venue = await this.prisma.venue.findUnique({ where: { id }, include: { league: true } });
    if (!venue) throw new NotFoundException('Cancha no encontrada');
    assertOwnerOrAdmin(user, venue.league.ownerId);
    await this.prisma.venue.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Consulta síncrona del Fixture Service ----------

  async seasonStructure(seasonId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId }, include: { league: { include: DETAIL_INCLUDE } } });
    if (!season) throw new NotFoundException('Temporada no encontrada');
    const { league, ...seasonData } = season;
    const { seasons: _seasons, categories, venues, ...leagueData } = league;
    return { season: seasonData, league: leagueData, categories, venues };
  }

  // ---------- utilidades ----------

  private canView(league: Pick<League, 'status' | 'ownerId'>, user?: AuthUser): boolean {
    return league.status === 'APPROVED' || isOwnerOrAdmin(user, league.ownerId);
  }

  private async ownedLeague(id: string, user: AuthUser): Promise<League> {
    const league = await this.prisma.league.findUnique({ where: { id } });
    if (!league) throw new NotFoundException('Liga no encontrada');
    assertOwnerOrAdmin(user, league.ownerId);
    return league;
  }

  private assertAgeRange(minAge?: number, maxAge?: number): void {
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      throw new BadRequestException('La edad mínima no puede ser mayor que la edad máxima');
    }
  }

  private assertHours(openTime: string, closeTime: string): void {
    if (minutesOf(openTime) >= minutesOf(closeTime)) {
      throw new BadRequestException('La hora de apertura debe ser anterior a la hora de cierre');
    }
  }
}
