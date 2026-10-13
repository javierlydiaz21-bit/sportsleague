'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { byId, idsParam } from '@/lib/compose';
import { formatDateTime, relativeTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Match, Team, TraceEntry } from '@/lib/types';
import { Badge, Card, EmptyState, PageSpinner, SectionTitle, cn } from '../ui';

const MESSAGES: Record<string, (e: TraceEntry) => string> = {
  match_published: (e) => `Partido publicado en el calendario (jornada ${e.round ?? '?'})`,
  match_created_manually: () => 'Partido creado manualmente',
  match_rescheduled: () => 'Partido reprogramado',
  match_suspended: (e) => `Partido suspendido: ${e.reason ?? ''}`,
  event_published: (e) => `Evento publicado → ${e.eventType}`,
  event_consumed: (e) => `Evento ${e.eventType} procesado (de ${e.from})`,
  referee_assigned: (e) => `Árbitro asignado automáticamente (zona ${e.zone ?? '—'})`,
  referee_assigned_manually: () => 'Árbitro asignado manualmente',
  referee_unassigned: () => 'Sin árbitro disponible',
  referee_confirmed: () => 'El árbitro confirmó el partido',
  referee_declined: () => 'El árbitro rechazó el partido',
  match_started: () => 'Partido iniciado',
  match_event_registered: (e) => `Evento en vivo: ${e.type} al minuto ${e.minute}`,
  match_event_deleted: () => 'Evento eliminado (corrección)',
  match_completed: () => 'Acta cerrada',
  match_status_live: () => 'Estado en calendario: en curso',
  match_status_finished: () => 'Estado en calendario: finalizado',
  live_match_suspended: () => 'Marcador en vivo detenido (suspensión)',
  standings_recalculated: (e) => `Tabla de posiciones recalculada (${e.teams ?? '?'} equipos)`,
  acta_reconciled: (e) => `Acta v${e.version} reconciliada desde Live Score`,
  notifications_sent: (e) => `Notificaciones enviadas: ${e.recipients} (${e.type})`,
  http_request: (e) => `${e.method} ${e.path} → ${e.status} (${e.durationMs} ms)`,
};

function describe(entry: TraceEntry): string {
  return MESSAGES[entry.msg]?.(entry) ?? entry.msg.replaceAll('_', ' ');
}

/** Trazabilidad completa por match_id: el recorrido de un partido a través de todos los microservicios. */
export function TraceViewer() {
  const { api } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: matches, loading } = useAsync(async () => {
    const traced = await api.get<{ matchId: string; lastActivity: string }[]>('/system/traces?limit=40');
    const ids = idsParam(traced.map((t) => t.matchId));
    const fixture = ids ? await api.get<Match[]>(`/matches?ids=${ids}&limit=100`).catch(() => [] as Match[]) : [];
    const teamIds = idsParam(fixture.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
    const teams = teamIds ? byId(await api.get<Team[]>(`/teams?ids=${teamIds}`).catch(() => [] as Team[])) : new Map<string, Team>();
    const byMatch = byId(fixture);
    return traced.map((t) => {
      const match = byMatch.get(t.matchId);
      const label = match ? `${teams.get(match.homeTeamId)?.name ?? 'Local'} vs ${teams.get(match.awayTeamId)?.name ?? 'Visitante'}` : t.matchId.slice(0, 8);
      return { ...t, label, round: match?.round };
    });
  }, [api]);
  const { data: entries, loading: loadingTrace } = useAsync(
    () => (selected ? api.get<TraceEntry[]>(`/system/traces/${selected}`) : Promise.resolve([] as TraceEntry[])),
    [api, selected],
  );

  if (loading && !matches) return <PageSpinner />;
  if (!matches || matches.length === 0) {
    return <EmptyState title="Aún no hay partidos trazados" description="Cada log con match_id de cualquier microservicio queda registrado aquí." />;
  }
  const services = [...new Set((entries ?? []).map((e) => e.service))];

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div>
        <SectionTitle title="Partidos" description="Más recientes primero" />
        <Card className="max-h-[32rem] divide-y divide-line overflow-y-auto">
          {matches.map((match) => (
            <button
              key={match.matchId}
              type="button"
              onClick={() => setSelected(match.matchId)}
              className={cn('w-full px-4 py-3 text-left transition hover:bg-surface', selected === match.matchId && 'bg-surface')}
            >
              <p className="truncate text-sm font-medium">{match.label}</p>
              <p className="text-xs text-muted">
                {match.round ? `Jornada ${match.round} · ` : ''}
                {relativeTime(match.lastActivity)}
              </p>
            </button>
          ))}
        </Card>
      </div>
      <div>
        {!selected ? (
          <EmptyState title="Selecciona un partido" description="Verás su ciclo de vida: publicación, asignación de árbitro, eventos en vivo, acta, estadísticas y notificaciones." />
        ) : loadingTrace && !entries ? (
          <PageSpinner />
        ) : (
          <div>
            <SectionTitle title={`${entries?.length ?? 0} registros`} description={`Servicios involucrados: ${services.join(', ')}`} />
            <ol className="relative space-y-0 border-l border-line pl-5">
              {(entries ?? []).map((entry, index) => (
                <li key={`${entry.ts}-${index}`} className="relative pb-4">
                  <span className={cn('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg', entry.level === 'error' ? 'bg-live' : entry.level === 'warn' ? 'bg-warn' : 'bg-line-strong')} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{entry.service}</Badge>
                    <span className="tabular text-xs text-subtle">{formatDateTime(entry.ts)}</span>
                  </div>
                  <p className="mt-1 text-sm">{describe(entry)}</p>
                  {typeof entry.requestId === 'string' && <p className="font-mono text-[11px] text-subtle">req {entry.requestId.slice(0, 8)}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
