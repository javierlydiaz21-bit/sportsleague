'use client';

import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL, formatTime } from '@/lib/format';
import { useAsync, usePolling } from '@/lib/hooks';
import type { DomainEvent, Role } from '@/lib/types';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../ui';

const STATUS_ES: Record<string, string> = { APPROVED: 'aprobada', REJECTED: 'rechazada', SUSPENDED: 'suspendida' };
const TYPE_ES: Record<string, string> = { GOAL: 'gol', YELLOW_CARD: 'amarilla', RED_CARD: 'roja', SUBSTITUTION: 'cambio' };

interface EventData {
  name?: string;
  role?: string;
  status?: string;
  ownerName?: string;
  leagueName?: string;
  round?: number;
  matches?: unknown[];
  refereeName?: string;
  label?: string;
  type?: string;
  minute?: number;
  score?: { home: number; away: number };
  version?: number;
  homeScore?: number;
  awayScore?: number;
  reason?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

/** Resumen legible de un evento de dominio (sin mostrar el JSON completo). */
export function describeEvent(event: DomainEvent): string {
  const d = event.data as EventData;
  switch (event.type) {
    case 'user.registered':
      return `${d.name} se registró como ${(ROLE_LABEL[d.role as Role] ?? d.role ?? '').toLowerCase()}`;
    case 'user.updated':
      return `${d.name}: ${ROLE_LABEL[d.role as Role] ?? d.role} · ${d.status === 'SUSPENDED' ? 'suspendida' : 'activa'}`;
    case 'league.created':
      return `Nueva liga "${d.name}" de ${d.ownerName ?? 'un organizador'}`;
    case 'league.reviewed':
      return `Liga "${d.name}" ${STATUS_ES[d.status ?? ''] ?? d.status}`;
    case 'rules.updated':
      return 'Reglamento de categoría actualizado';
    case 'fixture.published':
      return `${d.leagueName}: jornada ${d.round} publicada (${d.matches?.length ?? 0} partidos)`;
    case 'referee.assigned':
      return `${d.refereeName} asignado a ${d.label}`;
    case 'referee.unassigned':
      return `Sin árbitro para ${d.label}`;
    case 'match.started':
      return 'Partido iniciado';
    case 'match.event':
      return `${TYPE_ES[d.type ?? ''] ?? d.type} al minuto ${d.minute} · ${d.score?.home ?? 0}-${d.score?.away ?? 0}`;
    case 'match.event.deleted':
      return `Evento corregido · ${d.score?.home ?? 0}-${d.score?.away ?? 0}`;
    case 'match.completed':
      return `Acta v${d.version}: ${d.homeScore}-${d.awayScore}${d.reason === 'correction' ? ' (corrección)' : ''}`;
    case 'match.rescheduled':
      return `${d.homeTeamName} vs ${d.awayTeamName} reprogramado`;
    case 'match.suspended':
      return `Partido suspendido: ${d.reason}`;
    case 'standings.updated':
      return 'Tabla de posiciones recalculada';
    default:
      return '';
  }
}

export function EventsFeed() {
  const { api } = useAuth();
  const [paused, setPaused] = useState(false);
  const { data, reload } = useAsync(() => api.get<DomainEvent[]>('/system/events?limit=100'), [api]);
  usePolling(() => void reload(), 3000, !paused);

  return (
    <div>
      <SectionTitle
        title="Bus de eventos (Redis Pub/Sub)"
        description="Los últimos eventos de dominio publicados por los microservicios, en tiempo casi real."
        action={
          <Button variant="secondary" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? 'Reanudar' : 'Pausar'}
          </Button>
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState title="Aún no hay eventos" description="Crea una liga, publica un calendario o registra un gol para verlos fluir." />
      ) : (
        <Card className="divide-y divide-line">
          {data.map((event) => (
            <div key={event.id} className="grid grid-cols-[4.5rem_1fr] items-start gap-3 px-4 py-2.5 sm:grid-cols-[4.5rem_13rem_1fr_9rem]">
              <span className="tabular pt-0.5 text-xs text-subtle">{formatTime(event.occurredAt)}</span>
              <span className="font-mono text-xs">{event.type}</span>
              <span className="col-span-2 text-sm text-muted sm:col-span-1">{describeEvent(event)}</span>
              <span className="hidden justify-self-end sm:block">
                <Badge>{event.source}</Badge>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
