import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { LiveMatch, MatchEvent, Prisma } from '@prisma/client';
import {
  CacheService,
  EventBus,
  isOwnerOrAdmin,
  log,
  traceMatch,
  type AuthUser,
  type EventEnvelope,
} from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import { UpstreamClients } from './clients';
import { AddEventDto, CompleteMatchDto, ListLiveQuery } from './dto';
import { matchEventsRegistered } from './metrics';
import { computeScore, normalizeValue, type Score } from './score';
import { ViewersService } from './viewers.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_ORDER: Prisma.MatchEventOrderByWithRelationInput[] = [{ minute: 'asc' }, { createdAt: 'asc' }];

type Roster = Record<string, string[]>;

export interface LiveSnapshot {
  matchId: string;
  status: LiveMatch['status'] | 'NOT_STARTED';
  homeTeamId: string | null;
  awayTeamId: string | null;
  score: Score;
  events: MatchEvent[];
  startedAt: Date | null;
  finishedAt: Date | null;
  attendance: number | null;
  version: number;
  viewers: number;
}

@Injectable()
export class LiveService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
    private readonly cache: CacheService,
    private readonly upstream: UpstreamClients,
    private readonly viewers: ViewersService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe<{ matchId: string; reason: string }>('match.suspended', (event) => this.onMatchSuspended(event));
  }

  // ---------- Operación del partido (árbitro u organizador) ----------

  async start(matchId: string, user: AuthUser): Promise<LiveSnapshot> {
    const existing = await this.prisma.liveMatch.findUnique({ where: { matchId } });
    if (existing) {
      await this.assertCanOperate(user, existing);
      if (existing.status === 'LIVE') return this.snapshot(matchId);
      throw new ConflictException(existing.status === 'FINISHED' ? 'El partido ya finalizó' : 'El partido está suspendido');
    }

    const match = await this.upstream.match(matchId, user);
    if (match.fixtureStatus !== 'PUBLISHED') throw new ConflictException('El calendario de este partido aún no está publicado');
    if (match.status === 'SUSPENDED') throw new ConflictException('El partido está suspendido; reprogramalo antes de iniciarlo');
    if (match.status === 'FINISHED') throw new ConflictException('El partido ya finalizó');
    await this.assertCanOperate(user, { matchId, ownerId: match.ownerId });

    let live: LiveMatch;
    try {
      live = await this.prisma.liveMatch.create({
        data: {
          matchId,
          leagueId: match.leagueId,
          seasonId: match.seasonId,
          categoryId: match.categoryId,
          ownerId: match.ownerId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return this.snapshot(matchId); // inicio concurrente
      throw err;
    }
    await this.loadRoster(live).catch(() => undefined);
    traceMatch(matchId, 'match_started', { by: user.id, role: user.role });
    await this.bus.publish('match.started', {
      matchId,
      leagueId: live.leagueId,
      seasonId: live.seasonId,
      categoryId: live.categoryId,
      ownerId: live.ownerId,
      homeTeamId: live.homeTeamId,
      awayTeamId: live.awayTeamId,
      startedAt: live.startedAt.toISOString(),
    });
    return this.snapshot(matchId);
  }

  async addEvent(matchId: string, dto: AddEventDto, user: AuthUser) {
    const registeredAt = new Date();
    const live = await this.liveOrThrow(matchId);
    await this.assertCanEdit(user, live);
    if (dto.teamId !== live.homeTeamId && dto.teamId !== live.awayTeamId) {
      throw new BadRequestException('El equipo indicado no juega este partido');
    }
    if (dto.type === 'SUBSTITUTION' && (!dto.playerId || !dto.playerInId)) {
      throw new BadRequestException('La sustitución requiere el jugador que sale y el que entra');
    }
    await this.assertRoster(live, dto.teamId, [dto.playerId, dto.playerInId]);

    const event = await this.prisma.matchEvent.create({
      data: {
        matchId,
        type: dto.type,
        teamId: dto.teamId,
        playerId: dto.playerId ?? null,
        playerInId: dto.type === 'SUBSTITUTION' ? (dto.playerInId ?? null) : null,
        minute: dto.minute,
        value: normalizeValue(dto.type, dto.value),
        createdBy: user.id,
      },
    });
    const score = await this.score(live);
    matchEventsRegistered.inc({
      type: event.type,
      league_id: live.leagueId,
      season_id: live.seasonId,
      category_id: live.categoryId,
    });
    traceMatch(matchId, 'match_event_registered', { type: event.type, minute: event.minute, teamId: event.teamId, by: user.id });
    await this.bus.publish('match.event', {
      eventId: event.id,
      matchId,
      leagueId: live.leagueId,
      seasonId: live.seasonId,
      categoryId: live.categoryId,
      type: event.type,
      teamId: event.teamId,
      playerId: event.playerId,
      playerInId: event.playerInId,
      minute: event.minute,
      value: event.value,
      score,
      registeredAt: registeredAt.toISOString(),
      event,
    });
    if (live.status === 'FINISHED') await this.publishCompleted(live.matchId, 'correction');
    return { event, score };
  }

  async deleteEvent(matchId: string, eventId: string, user: AuthUser) {
    const live = await this.liveOrThrow(matchId);
    await this.assertCanEdit(user, live);
    const deleted = await this.prisma.matchEvent.deleteMany({ where: { id: eventId, matchId } });
    if (deleted.count === 0) throw new NotFoundException('Evento no encontrado');
    const score = await this.score(live);
    traceMatch(matchId, 'match_event_deleted', { eventId, by: user.id });
    await this.bus.publish('match.event.deleted', {
      matchId,
      eventId,
      score,
      registeredAt: new Date().toISOString(),
    });
    if (live.status === 'FINISHED') await this.publishCompleted(live.matchId, 'correction');
    return { ok: true, score };
  }

  async complete(matchId: string, dto: CompleteMatchDto, user: AuthUser): Promise<LiveSnapshot> {
    const live = await this.liveOrThrow(matchId);
    await this.assertCanOperate(user, live);
    if (live.status !== 'LIVE') throw new ConflictException('El partido no está en curso');
    const peak = await this.viewers.peak(matchId);
    await this.prisma.liveMatch.update({
      where: { matchId },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        attendance: dto.attendance ?? null,
        notes: dto.notes?.trim() || null,
        peakViewers: Math.max(peak, live.peakViewers),
      },
    });
    traceMatch(matchId, 'match_completed', { by: user.id });
    await this.publishCompleted(matchId, 'final');
    return this.snapshot(matchId);
  }

  // ---------- Consultas públicas ----------

  async snapshot(matchId: string): Promise<LiveSnapshot> {
    const live = await this.prisma.liveMatch.findUnique({ where: { matchId }, include: { events: { orderBy: EVENT_ORDER } } });
    const viewers = await this.viewers.count(matchId);
    if (!live) {
      return {
        matchId,
        status: 'NOT_STARTED',
        homeTeamId: null,
        awayTeamId: null,
        score: { home: 0, away: 0 },
        events: [],
        startedAt: null,
        finishedAt: null,
        attendance: null,
        version: 0,
        viewers,
      };
    }
    const { events, ...state } = live;
    return {
      matchId,
      status: state.status,
      homeTeamId: state.homeTeamId,
      awayTeamId: state.awayTeamId,
      score: computeScore(events, state.homeTeamId, state.awayTeamId),
      events,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      attendance: state.attendance,
      version: state.version,
      viewers,
    };
  }

  async list(query: ListLiveQuery) {
    const ids = query.ids
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id));
    const matches = await this.prisma.liveMatch.findMany({
      where: {
        ...(ids?.length ? { matchId: { in: ids } } : {}),
        ...(query.leagueId ? { leagueId: query.leagueId } : {}),
        ...(query.seasonId ? { seasonId: query.seasonId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: query.limit ?? 200,
    });
    const includeEvents = query.includeEvents === 'true';
    const events = await this.prisma.matchEvent.findMany({
      where: { matchId: { in: matches.map((m) => m.matchId) }, ...(includeEvents ? {} : { type: 'GOAL' }) },
      orderBy: EVENT_ORDER,
    });
    const byMatch = new Map<string, MatchEvent[]>();
    for (const event of events) byMatch.set(event.matchId, [...(byMatch.get(event.matchId) ?? []), event]);
    return matches.map((match) => {
      const matchEvents = byMatch.get(match.matchId) ?? [];
      return {
        ...match,
        score: computeScore(matchEvents, match.homeTeamId, match.awayTeamId),
        ...(includeEvents ? { events: matchEvents } : {}),
      };
    });
  }

  // ---------- Consumidor ----------

  async onMatchSuspended(event: EventEnvelope<{ matchId: string; reason: string }>): Promise<void> {
    const result = await this.prisma.liveMatch.updateMany({
      where: { matchId: event.data.matchId, status: 'LIVE' },
      data: { status: 'SUSPENDED', notes: event.data.reason },
    });
    if (result.count) traceMatch(event.data.matchId, 'live_match_suspended');
  }

  // ---------- utilidades ----------

  /** Publica el acta (match.completed). Se republica con una versión nueva ante correcciones. */
  private async publishCompleted(matchId: string, reason: 'final' | 'correction') {
    const live = await this.prisma.liveMatch.update({
      where: { matchId },
      data: { version: { increment: 1 } },
      include: { events: { orderBy: EVENT_ORDER } },
    });
    const score = computeScore(live.events, live.homeTeamId, live.awayTeamId);
    await this.bus.publish('match.completed', {
      matchId,
      leagueId: live.leagueId,
      seasonId: live.seasonId,
      categoryId: live.categoryId,
      ownerId: live.ownerId,
      homeTeamId: live.homeTeamId,
      awayTeamId: live.awayTeamId,
      homeScore: score.home,
      awayScore: score.away,
      version: live.version,
      reason,
      completedAt: (live.finishedAt ?? new Date()).toISOString(),
      attendance: live.attendance,
      events: live.events.map((e) => ({
        id: e.id,
        type: e.type,
        teamId: e.teamId,
        playerId: e.playerId,
        playerInId: e.playerInId,
        minute: e.minute,
        value: e.value,
      })),
    });
    log.info('acta_published', { matchId, version: live.version, reason });
  }

  private async score(live: LiveMatch): Promise<Score> {
    const goals = await this.prisma.matchEvent.findMany({ where: { matchId: live.matchId, type: 'GOAL' } });
    return computeScore(goals, live.homeTeamId, live.awayTeamId);
  }

  private async liveOrThrow(matchId: string): Promise<LiveMatch> {
    const live = await this.prisma.liveMatch.findUnique({ where: { matchId } });
    if (!live) throw new NotFoundException('El partido aún no ha comenzado');
    if (live.status === 'SUSPENDED') throw new ConflictException('El partido está suspendido');
    return live;
  }

  /** Tras el cierre, solo el organizador o el admin pueden corregir el acta. */
  private async assertCanEdit(user: AuthUser, live: LiveMatch): Promise<void> {
    if (live.status === 'FINISHED' && !isOwnerOrAdmin(user, live.ownerId)) {
      throw new ForbiddenException('El partido ya finalizó; solo el organizador puede corregir el acta');
    }
    await this.assertCanOperate(user, live);
  }

  /**
   * Permisos diferenciados: el organizador (o el admin) y el árbitro asignado al
   * partido —verificado contra el Referee Service— pueden registrar eventos.
   */
  async assertCanOperate(user: AuthUser, match: { matchId: string; ownerId: string }): Promise<void> {
    if (isOwnerOrAdmin(user, match.ownerId)) return;
    if (user.role === 'REFEREE' && user.email) {
      const key = `live:referee-check:${match.matchId}:${user.email.toLowerCase()}`;
      if ((await this.cache.get<boolean>(key)) === true) return;
      const result = await this.upstream.refereeAssigned(match.matchId, user.email);
      if (result.assigned) {
        await this.cache.set(key, true, 300);
        return;
      }
    }
    throw new ForbiddenException('Solo el árbitro asignado o el organizador de la liga pueden registrar eventos de este partido');
  }

  private async loadRoster(live: LiveMatch): Promise<Roster> {
    const players = await this.upstream.roster([live.homeTeamId, live.awayTeamId]);
    const roster: Roster = { [live.homeTeamId]: [], [live.awayTeamId]: [] };
    for (const player of players) roster[player.teamId]?.push(player.id);
    await this.cache.set(`live:roster:${live.matchId}`, roster, 86_400);
    return roster;
  }

  /** Valida que los jugadores pertenezcan al equipo (plantilla cacheada al iniciar el partido). */
  private async assertRoster(live: LiveMatch, teamId: string, playerIds: (string | undefined)[]): Promise<void> {
    const ids = playerIds.filter((id): id is string => !!id);
    if (ids.length === 0) return;
    let roster = await this.cache.get<Roster>(`live:roster:${live.matchId}`);
    if (!roster) roster = await this.loadRoster(live).catch(() => undefined);
    if (!roster) return; // Team Service no disponible: se prioriza no bloquear el registro en vivo
    const allowed = new Set(roster[teamId] ?? []);
    if (ids.some((id) => !allowed.has(id))) throw new BadRequestException('El jugador no pertenece al equipo indicado');
  }
}
