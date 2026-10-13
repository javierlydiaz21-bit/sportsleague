import { Injectable, OnModuleInit } from '@nestjs/common';
import type { MatchResult, Prisma } from '@prisma/client';
import { Counter, Histogram } from 'prom-client';
import { CacheService, EventBus, assertOwnerOrAdmin, log, registry, traceMatch, type AuthUser, type EventEnvelope } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_RULES,
  computeDiscipline,
  computeStandings,
  computeTopScorers,
  type ResultEvent,
  type ResultInput,
  type Rules,
} from './calculator';
import { UpstreamClients } from './clients';

const recalculations = new Counter({
  name: 'standings_recalculations_total',
  help: 'Recálculos idempotentes de la tabla de posiciones',
  labelNames: ['reason', 'outcome'] as const,
  registers: [registry],
});
const recalculationDuration = new Histogram({
  name: 'standings_recalculation_duration_seconds',
  help: 'Duración del recálculo de estadísticas',
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});
const cacheRequests = new Counter({
  name: 'standings_cache_requests_total',
  help: 'Consultas de la tabla de posiciones servidas desde la caché Redis',
  labelNames: ['result'] as const,
  registers: [registry],
});
const liveEventsObserved = new Counter({
  name: 'live_events_observed_total',
  help: 'Eventos de partido en vivo observados por Statistics',
  labelNames: ['type'] as const,
  registers: [registry],
});

interface MatchCompleted {
  matchId: string;
  leagueId: string;
  seasonId: string;
  categoryId: string;
  ownerId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  version: number;
  completedAt: string;
  events: ResultEvent[];
}

interface FixturePublished {
  seasonId: string;
  categoryId: string;
  matches: { homeTeamId: string; awayTeamId: string }[];
}

const CACHE_TTL = 300;
const key = (kind: string, seasonId: string, categoryId?: string) => `stats:${kind}:${seasonId}:${categoryId ?? 'all'}`;

@Injectable()
export class StatisticsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
    private readonly cache: CacheService,
    private readonly upstream: UpstreamClients,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe<MatchCompleted>('match.completed', (event) => this.onMatchCompleted(event));
    this.bus.subscribe<FixturePublished>('fixture.published', (event) => this.onFixturePublished(event));
    this.bus.subscribe<{ categoryId: string }>('rules.updated', (event) => this.onRulesUpdated(event));
    this.bus.subscribe<{ type: string }>('match.event', (event) => {
      liveEventsObserved.inc({ type: event.data.type });
    });
  }

  // ---------- Consumidores ----------

  async onMatchCompleted(event: EventEnvelope<MatchCompleted>): Promise<void> {
    const data = event.data;
    const stored = await this.prisma.matchResult.findUnique({ where: { matchId: data.matchId } });
    if (stored && stored.version > data.version) {
      log.info('stale_acta_ignored', { matchId: data.matchId, stored: stored.version, received: data.version });
      return;
    }
    await this.storeResult({
      matchId: data.matchId,
      leagueId: data.leagueId,
      seasonId: data.seasonId,
      categoryId: data.categoryId,
      ownerId: data.ownerId,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      version: data.version,
      completedAt: new Date(data.completedAt),
      events: data.events,
    });
    await this.recalculate(data.seasonId, data.categoryId, 'match.completed', data.matchId);
  }

  async onFixturePublished(event: EventEnvelope<FixturePublished>): Promise<void> {
    const { seasonId, categoryId } = event.data;
    const teamIds = [...new Set(event.data.matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
    const existing = await this.prisma.standing.findMany({ where: { seasonId, categoryId }, select: { teamId: true } });
    const known = new Set(existing.map((row) => row.teamId));
    if (teamIds.every((id) => known.has(id))) return;
    await this.recalculate(seasonId, categoryId, 'fixture.published', undefined, teamIds);
  }

  async onRulesUpdated(event: EventEnvelope<{ categoryId: string }>): Promise<void> {
    const { categoryId } = event.data;
    await this.cache.del(`stats:rules:${categoryId}`);
    const seasons = await this.prisma.standing.findMany({ where: { categoryId }, distinct: ['seasonId'], select: { seasonId: true } });
    for (const { seasonId } of seasons) await this.recalculate(seasonId, categoryId, 'rules.updated');
  }

  // ---------- Recálculo idempotente ----------

  /**
   * Recalcula TODO desde las actas almacenadas y reemplaza las tablas de la
   * categoría en una transacción. Procesar el mismo evento dos veces o una
   * corrección del acta produce siempre el mismo resultado (idempotencia).
   */
  async recalculate(seasonId: string, categoryId: string, reason: string, matchId?: string, extraTeams: string[] = []) {
    const stopTimer = recalculationDuration.startTimer();
    try {
      const rules = await this.rules(categoryId);
      const [results, known] = await Promise.all([
        this.prisma.matchResult.findMany({ where: { seasonId, categoryId } }),
        this.prisma.standing.findMany({ where: { seasonId, categoryId }, select: { teamId: true } }),
      ]);
      const inputs = results.map(toInput);
      const teamIds = [
        ...new Set([...known.map((row) => row.teamId), ...extraTeams, ...results.flatMap((r) => [r.homeTeamId, r.awayTeamId])]),
      ];
      const standings = computeStandings(teamIds, inputs, rules);
      const scorers = computeTopScorers(inputs);
      const discipline = computeDiscipline(inputs);
      const scope = { seasonId, categoryId };

      await this.prisma.$transaction([
        this.prisma.standing.deleteMany({ where: scope }),
        this.prisma.standing.createMany({ data: standings.map((row) => ({ ...scope, ...row })) }),
        this.prisma.topScorer.deleteMany({ where: scope }),
        this.prisma.topScorer.createMany({ data: scorers.map((row) => ({ ...scope, ...row })) }),
        this.prisma.disciplinaryRecord.deleteMany({ where: scope }),
        this.prisma.disciplinaryRecord.createMany({ data: discipline.map((row) => ({ ...scope, ...row })) }),
      ]);
      await this.cache.del(
        key('standings', seasonId, categoryId),
        key('standings', seasonId),
        key('scorers', seasonId, categoryId),
        key('scorers', seasonId),
        key('discipline', seasonId, categoryId),
        key('discipline', seasonId),
      );
      recalculations.inc({ reason, outcome: 'ok' });
      if (matchId) traceMatch(matchId, 'standings_recalculated', { seasonId, categoryId, teams: standings.length });
      else log.info('standings_recalculated', { seasonId, categoryId, reason });
      await this.bus.publish('standings.updated', { seasonId, categoryId, reason, leaderTeamId: standings[0]?.teamId ?? null });
      return { standings, scorers, discipline };
    } catch (err) {
      recalculations.inc({ reason, outcome: 'error' });
      throw err;
    } finally {
      stopTimer();
    }
  }

  /** POST /statistics/recalculate — corrige desde el acta oficial (reconcilia eventos perdidos). */
  async manualRecalculate(seasonId: string, categoryId: string, reconcile: boolean, user: AuthUser) {
    const season = await this.upstream.season(seasonId, user);
    assertOwnerOrAdmin(user, season.league.ownerId);
    let reconciled = 0;
    if (reconcile) {
      const actas = await this.upstream.finishedMatches(seasonId, categoryId);
      for (const acta of actas) {
        const stored = await this.prisma.matchResult.findUnique({ where: { matchId: acta.matchId } });
        if (stored && stored.version >= acta.version) continue;
        await this.storeResult({
          matchId: acta.matchId,
          leagueId: acta.leagueId,
          seasonId: acta.seasonId,
          categoryId: acta.categoryId,
          ownerId: acta.ownerId,
          homeTeamId: acta.homeTeamId,
          awayTeamId: acta.awayTeamId,
          homeScore: acta.score.home,
          awayScore: acta.score.away,
          version: acta.version,
          completedAt: new Date(acta.finishedAt ?? Date.now()),
          events: acta.events,
        });
        reconciled += 1;
        traceMatch(acta.matchId, 'acta_reconciled', { version: acta.version });
      }
    }
    const result = await this.recalculate(seasonId, categoryId, reconcile ? 'reconcile' : 'manual');
    return { reconciled, standings: result.standings };
  }

  // ---------- Consultas (tabla de posiciones servida desde Redis) ----------

  async standings(seasonId: string, categoryId?: string) {
    const { value, hit } = await this.cache.wrap(key('standings', seasonId, categoryId), CACHE_TTL, () =>
      this.prisma.standing.findMany({
        where: { seasonId, ...(categoryId ? { categoryId } : {}) },
        orderBy: [{ categoryId: 'asc' }, { position: 'asc' }],
      }),
    );
    cacheRequests.inc({ result: hit ? 'hit' : 'miss' });
    return value;
  }

  async topScorers(seasonId: string, categoryId?: string, limit = 20) {
    const { value } = await this.cache.wrap(key('scorers', seasonId, categoryId), CACHE_TTL, () =>
      this.prisma.topScorer.findMany({
        where: { seasonId, ...(categoryId ? { categoryId } : {}), goals: { gt: 0 } },
        orderBy: [{ goals: 'desc' }, { playerId: 'asc' }],
        take: 100,
      }),
    );
    return value.slice(0, limit);
  }

  async discipline(seasonId: string, categoryId?: string) {
    const { value } = await this.cache.wrap(key('discipline', seasonId, categoryId), CACHE_TTL, () =>
      this.prisma.disciplinaryRecord.findMany({
        where: { seasonId, ...(categoryId ? { categoryId } : {}) },
        orderBy: [{ redCards: 'desc' }, { yellowCards: 'desc' }],
      }),
    );
    return value;
  }

  playerRecord(playerId: string, seasonId?: string) {
    return this.prisma.disciplinaryRecord.findMany({ where: { playerId, ...(seasonId ? { seasonId } : {}) } });
  }

  results(seasonId: string, categoryId?: string) {
    return this.prisma.matchResult.findMany({
      where: { seasonId, ...(categoryId ? { categoryId } : {}) },
      orderBy: { completedAt: 'asc' },
      select: {
        matchId: true,
        categoryId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        version: true,
        completedAt: true,
      },
    });
  }

  // ---------- utilidades ----------

  private async storeResult(data: Omit<MatchResult, 'updatedAt' | 'events'> & { events: ResultEvent[] }) {
    const row = { ...data, events: data.events as unknown as Prisma.InputJsonValue };
    await this.prisma.matchResult.upsert({ where: { matchId: data.matchId }, create: row, update: row });
  }

  /** Reglamento con caché; si League Service no responde se usa el último conocido o el estándar. */
  private async rules(categoryId: string): Promise<Rules> {
    const cacheKey = `stats:rules:${categoryId}`;
    const cached = await this.cache.get<Rules>(cacheKey);
    if (cached) return cached;
    try {
      const rules = await this.upstream.rules(categoryId);
      await this.cache.set(cacheKey, rules, 3600);
      return rules;
    } catch (err) {
      log.warn('rules_fallback_to_default', { categoryId, error: (err as Error).message });
      return DEFAULT_RULES;
    }
  }
}

function toInput(result: MatchResult): ResultInput {
  return {
    matchId: result.matchId,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    completedAt: result.completedAt,
    events: (result.events as unknown as ResultEvent[]) ?? [],
  };
}
