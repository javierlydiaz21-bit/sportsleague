import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Fixture, Match, Prisma } from '@prisma/client';
import { Counter, Histogram } from 'prom-client';
import {
  EventBus,
  assertOwnerOrAdmin,
  env,
  isOwnerOrAdmin,
  log,
  registry,
  traceMatch,
  type AuthUser,
  type EventEnvelope,
} from '../chassis';
import { LeagueClient, TeamClient, type SeasonStructure, type TeamSummary } from '../clients/clients';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto, GenerateFixtureDto, ListMatchesQuery, RescheduleMatchDto, SuspendMatchDto } from './dto';
import type {
  FixturePublishedEvent,
  MatchCompletedEvent,
  MatchRescheduledEvent,
  MatchStartedEvent,
  MatchSuspendedEvent,
} from './events';
import { roundRobin, scheduleRounds, SchedulingError, shuffle, toUtc } from './scheduler';

const fixturesGenerated = new Counter({
  name: 'fixtures_generated_total',
  help: 'Calendarios generados',
  labelNames: ['outcome'] as const,
  registers: [registry],
});
const generationDuration = new Histogram({
  name: 'fixture_generation_duration_seconds',
  help: 'Tiempo de generación del calendario',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MATCH_STATUSES = ['SCHEDULED', 'LIVE', 'FINISHED', 'SUSPENDED'] as const;
const MATCH_ORDER: Prisma.MatchOrderByWithRelationInput[] = [{ round: 'asc' }, { scheduledAt: 'asc' }];

@Injectable()
export class FixturesService implements OnModuleInit {
  private readonly utcOffset = env('LEAGUE_UTC_OFFSET', '-05:00');

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
    private readonly league: LeagueClient,
    private readonly teams: TeamClient,
  ) {}

  onModuleInit(): void {
    // El estado del partido se actualiza a partir de los eventos del Live Score Service.
    this.bus.subscribe<MatchStartedEvent>('match.started', (event) => this.onMatchStarted(event));
    this.bus.subscribe<MatchCompletedEvent>('match.completed', (event) => this.onMatchCompleted(event));
  }

  // ---------- Generación automática ----------

  async generate(seasonId: string, dto: GenerateFixtureDto, user: AuthUser) {
    const stopTimer = generationDuration.startTimer();
    const structure = await this.league.structure(seasonId);
    assertOwnerOrAdmin(user, structure.league.ownerId);
    this.assertApproved(structure);

    const category = structure.categories.find((c) => c.id === dto.categoryId);
    if (!category) throw new NotFoundException('La categoría no pertenece a la liga de esta temporada');
    const venues = dto.venueIds?.length ? structure.venues.filter((v) => dto.venueIds!.includes(v.id)) : structure.venues;
    const teams = await this.teams.teamsOfCategory(dto.categoryId);
    if (teams.length < 2) throw new BadRequestException('Se necesitan al menos 2 equipos en la categoría');

    const existing = await this.prisma.fixture.findUnique({
      where: { seasonId_categoryId: { seasonId, categoryId: dto.categoryId } },
    });
    if (existing?.status === 'PUBLISHED') {
      throw new ConflictException('El calendario de esta categoría ya fue publicado. Reprograma partidos de forma individual.');
    }

    const config = {
      startDate: (dto.startDate ?? structure.season.startDate).slice(0, 10),
      matchDays: dto.matchDays?.length ? [...new Set(dto.matchDays)] : [...new Set(venues.flatMap((v) => v.availableDays))],
      slotMinutes: dto.slotMinutes ?? 120,
      minRestDays: dto.minRestDays ?? 3,
      doubleRound: dto.doubleRound ?? false,
    };
    const teamIds = dto.shuffle === false ? teams.map((t) => t.id) : shuffle(teams.map((t) => t.id));
    const rounds = roundRobin(teamIds, config.doubleRound);

    let scheduled;
    try {
      scheduled = scheduleRounds(rounds, venues, {
        startDate: config.startDate,
        matchDays: config.matchDays,
        slotMinutes: config.slotMinutes,
        minRestDays: config.minRestDays,
        homeVenues: Object.fromEntries(teams.map((t) => [t.id, t.homeVenueId])),
      });
    } catch (err) {
      fixturesGenerated.inc({ outcome: 'rejected' });
      if (err instanceof SchedulingError) throw new UnprocessableEntityException(err.message);
      throw err;
    }

    const base = { seasonId, categoryId: dto.categoryId, leagueId: structure.league.id, ownerId: structure.league.ownerId };
    const fixture = await this.prisma.$transaction(async (tx) => {
      if (existing) await tx.fixture.delete({ where: { id: existing.id } });
      return tx.fixture.create({
        data: {
          ...base,
          doubleRound: config.doubleRound,
          totalRounds: rounds.length,
          config,
          matches: {
            create: scheduled.map((m) => ({
              ...base,
              round: m.round,
              homeTeamId: m.homeTeamId,
              awayTeamId: m.awayTeamId,
              venueId: m.venueId,
              scheduledAt: toUtc(m.date, m.time, this.utcOffset),
            })),
          },
        },
        include: { matches: { orderBy: MATCH_ORDER } },
      });
    }, { timeout: 30_000 });

    const warnings: string[] = [];
    const lastDate = scheduled.reduce((max, m) => (m.date > max ? m.date : max), config.startDate);
    const seasonEnd = structure.season.endDate.slice(0, 10);
    if (lastDate > seasonEnd) {
      warnings.push(`El calendario termina el ${lastDate}, después del cierre de la temporada (${seasonEnd}).`);
    }
    fixturesGenerated.inc({ outcome: 'ok' });
    stopTimer();
    log.info('fixture_generated', { fixtureId: fixture.id, seasonId, categoryId: dto.categoryId, matches: scheduled.length });
    return { ...fixture, warnings, lastDate };
  }

  async publish(fixtureId: string, user: AuthUser) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id: fixtureId }, include: { matches: { orderBy: MATCH_ORDER } } });
    if (!fixture) throw new NotFoundException('Calendario no encontrado');
    assertOwnerOrAdmin(user, fixture.ownerId);
    if (fixture.status === 'PUBLISHED') throw new ConflictException('El calendario ya está publicado');

    const [structure, teams] = await Promise.all([
      this.league.structure(fixture.seasonId),
      this.teams.teamsOfCategory(fixture.categoryId),
    ]);
    this.assertApproved(structure);

    const updated = await this.prisma.fixture.update({
      where: { id: fixtureId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { matches: { orderBy: MATCH_ORDER } },
    });
    await this.publishRounds(updated, updated.matches, structure, teams);
    return updated;
  }

  async discard(fixtureId: string, user: AuthUser) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id: fixtureId } });
    if (!fixture) throw new NotFoundException('Calendario no encontrado');
    assertOwnerOrAdmin(user, fixture.ownerId);
    if (fixture.status === 'PUBLISHED') throw new ConflictException('Un calendario publicado no se puede descartar');
    await this.prisma.fixture.delete({ where: { id: fixtureId } });
    return { ok: true };
  }

  // ---------- Partidos manuales y cambios ----------

  async createMatch(dto: CreateMatchDto, user: AuthUser) {
    if (dto.homeTeamId === dto.awayTeamId) throw new BadRequestException('Un equipo no puede jugar contra sí mismo');
    const structure = await this.league.structure(dto.seasonId);
    assertOwnerOrAdmin(user, structure.league.ownerId);
    this.assertApproved(structure);
    if (!structure.categories.some((c) => c.id === dto.categoryId)) {
      throw new NotFoundException('La categoría no pertenece a la liga de esta temporada');
    }
    if (dto.venueId && !structure.venues.some((v) => v.id === dto.venueId)) {
      throw new BadRequestException('La cancha no pertenece a esta liga');
    }
    const teams = await this.teams.teamsOfCategory(dto.categoryId);
    const ids = new Set(teams.map((t) => t.id));
    if (!ids.has(dto.homeTeamId) || !ids.has(dto.awayTeamId)) {
      throw new BadRequestException('Ambos equipos deben pertenecer a la categoría');
    }

    const base = { seasonId: dto.seasonId, categoryId: dto.categoryId, leagueId: structure.league.id, ownerId: structure.league.ownerId };
    let fixture = await this.prisma.fixture.findUnique({
      where: { seasonId_categoryId: { seasonId: dto.seasonId, categoryId: dto.categoryId } },
    });
    if (!fixture) {
      fixture = await this.prisma.fixture.create({
        data: { ...base, status: 'PUBLISHED', publishedAt: new Date(), config: { manual: true } },
      });
    }
    const maxRound = await this.prisma.match.aggregate({ where: { fixtureId: fixture.id }, _max: { round: true } });
    const round = dto.round ?? (maxRound._max.round ?? 0) + 1;
    const match = await this.prisma.match.create({
      data: {
        ...base,
        fixtureId: fixture.id,
        round,
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        venueId: dto.venueId ?? null,
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
    if (round > fixture.totalRounds) {
      fixture = await this.prisma.fixture.update({ where: { id: fixture.id }, data: { totalRounds: round } });
    }
    traceMatch(match.id, 'match_created_manually', { round });
    if (fixture.status === 'PUBLISHED') await this.publishRounds(fixture, [match], structure, teams);
    return match;
  }

  /** PUT /matches/{id}/venue — cambio de sede u horario (notifica a equipos y árbitros). */
  async reschedule(matchId: string, dto: RescheduleMatchDto, user: AuthUser) {
    if (!dto.venueId && !dto.scheduledAt) throw new BadRequestException('Indica una nueva cancha o un nuevo horario');
    const match = await this.findMatch(matchId);
    assertOwnerOrAdmin(user, match.ownerId);
    if (match.status !== 'SCHEDULED' && match.status !== 'SUSPENDED') {
      throw new ConflictException('Solo se pueden reprogramar partidos que no han comenzado');
    }
    const structure = await this.league.structure(match.seasonId);
    if (dto.venueId && !structure.venues.some((v) => v.id === dto.venueId)) {
      throw new BadRequestException('La cancha no pertenece a esta liga');
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        ...(dto.venueId ? { venueId: dto.venueId } : {}),
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        status: 'SCHEDULED',
        suspensionReason: null,
      },
    });
    traceMatch(matchId, 'match_rescheduled', { scheduledAt: updated.scheduledAt.toISOString(), venueId: updated.venueId });

    if (match.fixture.status === 'PUBLISHED') {
      const teams = await this.teams.teamsOfCategory(match.categoryId).catch(() => [] as TeamSummary[]);
      const venue = structure.venues.find((v) => v.id === updated.venueId);
      const previousVenue = structure.venues.find((v) => v.id === match.venueId);
      const event: MatchRescheduledEvent = {
        matchId,
        leagueId: match.leagueId,
        leagueName: structure.league.name,
        seasonId: match.seasonId,
        categoryId: match.categoryId,
        ownerId: match.ownerId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: teams.find((t) => t.id === match.homeTeamId)?.name ?? 'Local',
        awayTeamName: teams.find((t) => t.id === match.awayTeamId)?.name ?? 'Visitante',
        scheduledAt: updated.scheduledAt.toISOString(),
        previousScheduledAt: match.scheduledAt.toISOString(),
        venueId: updated.venueId,
        venueName: venue?.name ?? null,
        venueZone: venue?.zone ?? null,
        previousVenueName: previousVenue?.name ?? null,
      };
      await this.bus.publish('match.rescheduled', event);
    }
    return updated;
  }

  async suspend(matchId: string, dto: SuspendMatchDto, user: AuthUser) {
    const match = await this.findMatch(matchId);
    assertOwnerOrAdmin(user, match.ownerId);
    if (match.status !== 'SCHEDULED' && match.status !== 'LIVE') {
      throw new ConflictException('Solo se pueden suspender partidos programados o en curso');
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'SUSPENDED', suspensionReason: dto.reason.trim() },
    });
    traceMatch(matchId, 'match_suspended', { reason: dto.reason });
    const event: MatchSuspendedEvent = {
      matchId,
      leagueId: match.leagueId,
      seasonId: match.seasonId,
      categoryId: match.categoryId,
      ownerId: match.ownerId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      reason: dto.reason.trim(),
      previousStatus: match.status,
    };
    await this.bus.publish('match.suspended', event);
    return updated;
  }

  // ---------- Consultas ----------

  async seasonFixtures(seasonId: string, categoryId: string | undefined, user?: AuthUser) {
    const fixtures = await this.prisma.fixture.findMany({
      where: { seasonId, ...(categoryId ? { categoryId } : {}) },
      include: { matches: { orderBy: MATCH_ORDER } },
      orderBy: { createdAt: 'asc' },
    });
    return fixtures.filter((f) => f.status === 'PUBLISHED' || isOwnerOrAdmin(user, f.ownerId));
  }

  async getFixture(id: string, user?: AuthUser) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id }, include: { matches: { orderBy: MATCH_ORDER } } });
    if (!fixture || (fixture.status !== 'PUBLISHED' && !isOwnerOrAdmin(user, fixture.ownerId))) {
      throw new NotFoundException('Calendario no encontrado');
    }
    return fixture;
  }

  listMatches(query: ListMatchesQuery) {
    const statuses = query.status
      ?.split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is (typeof MATCH_STATUSES)[number] => (MATCH_STATUSES as readonly string[]).includes(s));
    const ids = query.ids
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id));
    const where: Prisma.MatchWhereInput = {
      fixture: { status: 'PUBLISHED' },
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(query.seasonId ? { seasonId: query.seasonId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.teamId ? { OR: [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }] } : {}),
      ...(statuses?.length ? { status: { in: statuses } } : {}),
      ...(ids?.length ? { id: { in: ids } } : {}),
      ...(query.from || query.to
        ? { scheduledAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    };
    return this.prisma.match.findMany({
      where,
      orderBy: { scheduledAt: query.order ?? 'asc' },
      take: query.limit ?? 100,
    });
  }

  async getMatch(id: string, user?: AuthUser) {
    const match = await this.findMatch(id);
    if (match.fixture.status !== 'PUBLISHED' && !isOwnerOrAdmin(user, match.ownerId)) {
      throw new NotFoundException('Partido no encontrado');
    }
    const { fixture, ...rest } = match;
    return { ...rest, fixtureStatus: fixture.status };
  }

  // ---------- Consumidores de eventos (idempotentes) ----------

  async onMatchStarted(event: EventEnvelope<MatchStartedEvent>): Promise<void> {
    const result = await this.prisma.match.updateMany({
      where: { id: event.data.matchId, status: 'SCHEDULED' },
      data: { status: 'LIVE' },
    });
    if (result.count) traceMatch(event.data.matchId, 'match_status_live');
  }

  async onMatchCompleted(event: EventEnvelope<MatchCompletedEvent>): Promise<void> {
    const result = await this.prisma.match.updateMany({
      where: { id: event.data.matchId, status: { in: ['SCHEDULED', 'LIVE'] } },
      data: { status: 'FINISHED' },
    });
    if (result.count) traceMatch(event.data.matchId, 'match_status_finished');
  }

  // ---------- utilidades ----------

  private async publishRounds(fixture: Fixture, matches: Match[], structure: SeasonStructure, teams: TeamSummary[]) {
    const teamNames = new Map(teams.map((t) => [t.id, t.name]));
    const venues = new Map(structure.venues.map((v) => [v.id, v]));
    const categoryName = structure.categories.find((c) => c.id === fixture.categoryId)?.name ?? '';
    const byRound = new Map<number, Match[]>();
    for (const match of matches) byRound.set(match.round, [...(byRound.get(match.round) ?? []), match]);

    for (const [round, list] of [...byRound.entries()].sort(([a], [b]) => a - b)) {
      for (const match of list) traceMatch(match.id, 'match_published', { round, fixtureId: fixture.id });
      const event: FixturePublishedEvent = {
        fixtureId: fixture.id,
        leagueId: fixture.leagueId,
        leagueName: structure.league.name,
        seasonId: fixture.seasonId,
        categoryId: fixture.categoryId,
        categoryName,
        ownerId: fixture.ownerId,
        round,
        totalRounds: fixture.totalRounds,
        matches: list.map((m) => {
          const venue = m.venueId ? venues.get(m.venueId) : undefined;
          return {
            matchId: m.id,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            homeTeamName: teamNames.get(m.homeTeamId) ?? 'Local',
            awayTeamName: teamNames.get(m.awayTeamId) ?? 'Visitante',
            venueId: m.venueId,
            venueName: venue?.name ?? null,
            venueZone: venue?.zone ?? null,
            scheduledAt: m.scheduledAt.toISOString(),
          };
        }),
      };
      await this.bus.publish('fixture.published', event);
    }
  }

  private async findMatch(id: string): Promise<Match & { fixture: Fixture }> {
    const match = await this.prisma.match.findUnique({ where: { id }, include: { fixture: true } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    return match;
  }

  private assertApproved(structure: SeasonStructure): void {
    if (structure.league.status !== 'APPROVED') {
      throw new ConflictException('La liga debe estar aprobada por un administrador antes de programar partidos');
    }
  }
}
