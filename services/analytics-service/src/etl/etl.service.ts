import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { Counter, Histogram } from 'prom-client';
import { RedisService, envInt, log, registry } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import { resolveReplicaUrl } from './replica-url';
import {
  buildAttendance,
  buildLeagueKpis,
  buildSuspended,
  buildTrends,
  type EventRow,
  type FixtureRow,
  type LiveRow,
  type ResultRow,
} from './transform';

const etlRuns = new Counter({ name: 'etl_runs_total', help: 'Ejecuciones del ETL', labelNames: ['status'] as const, registers: [registry] });
const etlDuration = new Histogram({
  name: 'etl_duration_seconds',
  help: 'Duración del ETL',
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
});

type ReplicaName = 'fixture' | 'livescore' | 'statistics';

/**
 * ETL periódico sobre réplicas de SOLO LECTURA (usuario analytics_ro). No consume
 * eventos ni llama a otros servicios: las consultas analíticas pesadas nunca
 * compiten con las bases operativas porque solo se leen réplicas.
 */
@Injectable()
export class EtlService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly replicas = new Map<ReplicaName, Pool>();
  private timer?: NodeJS.Timeout;
  private initial?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    const primary = process.env.DATABASE_URL;
    const urls: Record<ReplicaName, string | undefined> = {
      fixture: resolveReplicaUrl(process.env.FIXTURE_REPLICA_URL, primary),
      livescore: resolveReplicaUrl(process.env.LIVESCORE_REPLICA_URL, primary),
      statistics: resolveReplicaUrl(process.env.STATISTICS_REPLICA_URL, primary),
    };
    for (const [name, url] of Object.entries(urls) as [ReplicaName, string | undefined][]) {
      if (url) this.replicas.set(name, new Pool({ connectionString: url, max: 2, statement_timeout: 15_000 }));
    }
  }

  onApplicationBootstrap(): void {
    if (process.env.ETL_DISABLED === 'true') return;
    const minutes = envInt('ETL_INTERVAL_MINUTES', 5);
    this.initial = setTimeout(() => void this.run('startup').catch(() => undefined), envInt('ETL_INITIAL_DELAY_SECONDS', 20) * 1000);
    this.timer = setInterval(() => void this.run('schedule').catch(() => undefined), minutes * 60_000);
  }

  async onModuleDestroy(): Promise<void> {
    clearTimeout(this.initial);
    clearInterval(this.timer);
    await Promise.allSettled([...this.replicas.values()].map((pool) => pool.end()));
  }

  async run(trigger: string) {
    if (this.running) return { skipped: true, reason: 'Ya hay una ejecución en curso' };
    // Candado distribuido: con varias réplicas del servicio solo una ejecuta el ETL.
    const lock = await this.redis.client.set('analytics:etl-lock', '1', 'EX', 120, 'NX').catch(() => 'OK');
    if (lock !== 'OK') return { skipped: true, reason: 'Otra instancia está ejecutando el ETL' };

    this.running = true;
    const stopTimer = etlDuration.startTimer();
    const run = await this.prisma.etlRun.create({ data: { trigger, status: 'RUNNING' } });
    const started = Date.now();
    try {
      // E — extracción desde las réplicas de solo lectura
      const [matches, live, events, results] = await Promise.all([
        this.query<FixtureRow>(
          'fixture',
          `SELECT m.id, m.league_id, m.season_id, m.category_id, m.owner_id, m.status, m.scheduled_at,
                  m.suspension_reason, m.home_team_id, m.away_team_id
             FROM matches m JOIN fixtures f ON f.id = m.fixture_id
            WHERE f.status = 'PUBLISHED'`,
        ),
        this.query<LiveRow>('livescore', 'SELECT match_id, status, attendance, peak_viewers FROM live_matches'),
        this.query<EventRow>('livescore', 'SELECT match_id, type, value FROM match_events'),
        this.query<ResultRow>(
          'statistics',
          `SELECT match_id, league_id, season_id, category_id, home_team_id, away_team_id, home_score, away_score, completed_at
             FROM match_results ORDER BY completed_at`,
        ),
      ]);

      // T — transformación
      const attendance = buildAttendance(matches, live);
      const suspended = buildSuspended(matches);
      const trends = buildTrends(results);
      const kpis = buildLeagueKpis(matches, live, events);

      // L — carga: las tablas analíticas se reescriben en cada corrida
      await this.prisma.$transaction([
        this.prisma.attendanceEstimate.deleteMany(),
        this.prisma.attendanceEstimate.createMany({ data: attendance }),
        this.prisma.suspendedMatch.deleteMany(),
        this.prisma.suspendedMatch.createMany({ data: suspended }),
        this.prisma.teamPerformanceTrend.deleteMany(),
        this.prisma.teamPerformanceTrend.createMany({ data: trends }),
        this.prisma.leagueKpi.deleteMany(),
        this.prisma.leagueKpi.createMany({ data: kpis }),
      ]);

      const rowsProcessed = matches.length + live.length + events.length + results.length;
      const finished = await this.prisma.etlRun.update({
        where: { id: run.id },
        data: { status: 'SUCCESS', finishedAt: new Date(), durationMs: Date.now() - started, rowsProcessed },
      });
      etlRuns.inc({ status: 'success' });
      log.info('etl_completed', { trigger, rowsProcessed, durationMs: finished.durationMs });
      return finished;
    } catch (err) {
      etlRuns.inc({ status: 'failed' });
      log.error('etl_failed', { trigger, error: (err as Error).message });
      return this.prisma.etlRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date(), durationMs: Date.now() - started, error: (err as Error).message.slice(0, 500) },
      });
    } finally {
      stopTimer();
      this.running = false;
      await this.redis.client.del('analytics:etl-lock').catch(() => undefined);
    }
  }

  replicaNames(): string[] {
    return [...this.replicas.keys()];
  }

  private async query<T>(replica: ReplicaName, sql: string): Promise<T[]> {
    const pool = this.replicas.get(replica);
    if (!pool) {
      log.warn('replica_not_configured', { replica });
      return [];
    }
    const result = await pool.query(sql);
    return result.rows as T[];
  }
}
