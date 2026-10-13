'use client';

import { useAuth } from '@/lib/auth';
import { byId, idsParam } from '@/lib/compose';
import { formatDate, relativeTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { LeagueKpi, Team } from '@/lib/types';
import { ColumnChart } from '../../charts/column-chart';
import { Card, EmptyState, PageSpinner, SectionTitle, Stat } from '../../ui';
import type { LeagueTabProps } from '../league-manager';

interface AttendanceRow {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  estimatedAttendance: number;
  source: 'REPORTED' | 'ONLINE_PEAK';
}

interface SuspendedRow {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  reason: string | null;
  scheduledAt: string;
}

interface LeagueAnalytics {
  kpi: LeagueKpi | null;
  attendance: AttendanceRow[];
  suspended: SuspendedRow[];
  computedAt: string | null;
}

export function AnalyticsTab({ league }: LeagueTabProps) {
  const { api } = useAuth();
  const { data, loading } = useAsync(async () => {
    const analytics = await api.get<LeagueAnalytics>(`/analytics/leagues/${league.id}`);
    const ids = idsParam([...analytics.attendance, ...analytics.suspended].flatMap((r) => [r.homeTeamId, r.awayTeamId]));
    const teams = ids ? await api.get<Team[]>(`/teams?ids=${ids}`).catch(() => [] as Team[]) : [];
    return { ...analytics, teams: byId(teams) };
  }, [api, league.id]);

  if (loading && !data) return <PageSpinner />;
  if (!data?.kpi) {
    return (
      <EmptyState
        title="Aún no hay datos analíticos"
        description="El Analytics Service ejecuta su ETL cada pocos minutos sobre réplicas de solo lectura. Vuelve cuando haya partidos publicados."
      />
    );
  }

  const { kpi, teams } = data;
  const label = (row: { homeTeamId: string; awayTeamId: string }) =>
    `${teams.get(row.homeTeamId)?.name ?? 'Local'} vs ${teams.get(row.awayTeamId)?.name ?? 'Visitante'}`;

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted">Calculado {data.computedAt ? relativeTime(data.computedAt) : ''} por el ETL del Analytics Service.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Partidos jugados" value={`${kpi.finished} / ${kpi.totalMatches}`} hint={`${kpi.scheduled} programados`} />
        <Stat label="Promedio de goles" value={kpi.avgGoalsPerMatch.toLocaleString('es-CO')} hint={`${kpi.totalGoals} en total`} />
        <Stat label="Asistencia promedio" value={Math.round(kpi.avgAttendance).toLocaleString('es-CO')} hint="Acta o pico de espectadores en línea" />
        <Stat label="Suspendidos" value={kpi.suspended} hint={`${kpi.totalCards} tarjetas en la temporada`} />
      </div>

      {data.attendance.length > 0 && (
        <div>
          <SectionTitle title="Asistencia estimada por partido" description="En orden cronológico. Pasa el cursor sobre una columna para ver el detalle." />
          <Card className="p-4">
            <ColumnChart
              caption="Asistencia estimada por partido"
              unit="personas"
              data={data.attendance.map((row, index) => ({
                key: row.matchId,
                label: String(index + 1),
                value: row.estimatedAttendance,
                detail: `${label(row)} · ${formatDate(row.scheduledAt)}${row.source === 'ONLINE_PEAK' ? ' · pico en línea' : ''}`,
              }))}
            />
          </Card>
        </div>
      )}

      <div>
        <SectionTitle title="Partidos suspendidos" />
        {data.suspended.length === 0 ? (
          <p className="text-sm text-muted">No hay partidos suspendidos.</p>
        ) : (
          <Card className="divide-y divide-line">
            {data.suspended.map((row) => (
              <div key={row.matchId} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{label(row)}</span>
                <span className="text-muted">{row.reason ?? 'Sin motivo'}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
