'use client';

import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { relativeTime } from '@/lib/format';
import { useAsync, usePolling } from '@/lib/hooks';
import type { DomainEvent, EtlRun, LeagueKpi, SystemHealth } from '@/lib/types';
import { Button, Card, SectionTitle, Stat, StatusDot } from '../ui';
import { describeEvent } from './events-feed';

interface UsersStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  registeredLast7Days: number;
}
interface LeaguesStats {
  total: number;
  byStatus: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED', number>;
}
interface AnalyticsOverview {
  totals: { matches: number; finished: number; live: number; suspended: number; goals: number; avgGoalsPerMatch: number; totalAttendance: number };
  leagues: LeagueKpi[];
  lastRuns: EtlRun[];
}

export function AdminOverview({ goTo }: { goTo: (tab: string) => void }) {
  const { api } = useAuth();
  const { data, reload } = useAsync(async () => {
    const [users, leagues, analytics, health, events] = await Promise.all([
      api.get<UsersStats>('/users/stats').catch(() => null),
      api.get<LeaguesStats>('/leagues/stats').catch(() => null),
      api.get<AnalyticsOverview>('/analytics/overview').catch(() => null),
      api.get<SystemHealth>('/system/health').catch(() => null),
      api.get<DomainEvent[]>('/system/events?limit=8').catch(() => [] as DomainEvent[]),
    ]);
    return { users, leagues, analytics, health, events };
  }, [api]);
  usePolling(() => void reload(), 15_000);

  const pending = data?.leagues?.byStatus.PENDING ?? 0;
  const health = data?.health;
  const down = health?.services.filter((s) => s.status !== 'up') ?? [];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-medium text-muted">Ligas por autorizar</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{pending}</p>
            <p className="mt-1 text-xs text-muted">{data?.leagues?.byStatus.APPROVED ?? 0} aprobadas en total</p>
          </div>
          <Button variant={pending > 0 ? 'primary' : 'secondary'} onClick={() => goTo('ligas')}>
            Revisar <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
        <Card className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-medium text-muted">Estado de la plataforma</p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
              <StatusDot status={health ? (down.length === 0 && health.redis.status === 'up' ? 'up' : 'degraded') : 'down'} />
              {health ? `${health.summary.up}/${health.summary.total}` : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {health ? (down.length === 0 ? 'Todos los microservicios responden' : `Con problemas: ${down.map((s) => s.label).join(', ')}`) : 'Consultando…'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => goTo('sistema')}>
            Ver detalle <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Usuarios" value={data?.users?.total ?? '—'} hint={`${data?.users?.registeredLast7Days ?? 0} nuevos en 7 días`} />
        <Stat label="Organizadores" value={data?.users?.byRole.ORGANIZER ?? 0} hint={`${data?.users?.byRole.REFEREE ?? 0} árbitros · ${data?.users?.byRole.SPECTATOR ?? 0} aficionados`} />
        <Stat label="Partidos jugados" value={data?.analytics?.totals.finished ?? 0} hint={`${data?.analytics?.totals.matches ?? 0} programados en total`} />
        <Stat label="En vivo ahora" value={data?.analytics?.totals.live ?? 0} tone={(data?.analytics?.totals.live ?? 0) > 0 ? 'live' : undefined} hint={`${data?.analytics?.totals.goals ?? 0} goles registrados`} />
      </div>

      <div>
        <SectionTitle
          title="Actividad reciente en el bus de eventos"
          action={
            <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => goTo('eventos')}>
              Ver todo
            </button>
          }
        />
        <Card className="divide-y divide-line">
          {(data?.events ?? []).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-mono text-xs text-muted">{event.type}</span>
                <span className="ml-3">{describeEvent(event)}</span>
              </span>
              <span className="shrink-0 text-xs text-subtle">{relativeTime(event.occurredAt)}</span>
            </div>
          ))}
          {data && data.events.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">Aún no se han publicado eventos</p>}
        </Card>
      </div>
    </div>
  );
}
