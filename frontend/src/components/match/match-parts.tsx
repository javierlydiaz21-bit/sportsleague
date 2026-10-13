import { ArrowLeftRight, Eye, Trash2 } from 'lucide-react';
import { eventLabel, formatDateTime, MATCH_STATUS_LABEL, playerName } from '@/lib/format';
import type { LiveStatus, MatchEvent, Player, Score, Sport, Team } from '@/lib/types';
import { Badge, LiveBadge, TeamBadge, cn } from '../ui';

export function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'GOAL') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />;
  if (type === 'YELLOW_CARD') return <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-yellow-400" aria-hidden />;
  if (type === 'RED_CARD') return <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-red-500" aria-hidden />;
  return <ArrowLeftRight className="h-3.5 w-3.5 text-info" aria-hidden />;
}

export function StatusBadge({ status }: { status: LiveStatus }) {
  if (status === 'LIVE') return <LiveBadge />;
  if (status === 'FINISHED') return <Badge>Finalizado</Badge>;
  if (status === 'SUSPENDED') return <Badge tone="amber">Suspendido</Badge>;
  return <Badge tone="blue">{MATCH_STATUS_LABEL.SCHEDULED}</Badge>;
}

export function Scoreboard({
  home,
  away,
  score,
  status,
  scheduledAt,
  venueName,
  viewers,
  connected,
  highlight,
  subtitle,
}: {
  home?: Team;
  away?: Team;
  score: Score;
  status: LiveStatus;
  scheduledAt: string;
  venueName?: string | null;
  viewers?: number;
  connected?: boolean;
  highlight?: string | null;
  subtitle?: string;
}) {
  const showScore = status !== 'NOT_STARTED';
  return (
    <div className="rounded-2xl border border-line bg-elevated px-4 py-8 sm:px-10">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{subtitle}</span>
        <StatusBadge status={status} />
      </div>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <TeamBadge name={home?.name ?? '?'} color={home?.color} size="lg" />
          <span className="text-sm font-semibold sm:text-base">{home?.name ?? 'Local'}</span>
        </div>
        <div key={highlight ?? 'score'} className={cn('tabular text-center text-5xl font-semibold tracking-tight sm:text-6xl', highlight && 'score-pop')}>
          {showScore ? (
            <>
              {score.home}
              <span className="mx-2 text-subtle">:</span>
              {score.away}
            </>
          ) : (
            <span className="text-3xl text-subtle">vs</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <TeamBadge name={away?.name ?? '?'} color={away?.color} size="lg" />
          <span className="text-sm font-semibold sm:text-base">{away?.name ?? 'Visitante'}</span>
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-xs text-muted">
        <p>
          {formatDateTime(scheduledAt)}
          {venueName ? ` · ${venueName}` : ''}
        </p>
        {viewers !== undefined && (
          <p className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {viewers} conectado{viewers === 1 ? '' : 's'}
            {connected !== undefined && (
              <span className={cn('ml-2 inline-flex items-center gap-1', connected ? 'text-brand' : 'text-subtle')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-brand' : 'bg-subtle')} />
                {connected ? 'En tiempo real' : 'Reconectando…'}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function Timeline({
  events,
  homeTeamId,
  players,
  sport,
  onDelete,
}: {
  events: MatchEvent[];
  homeTeamId: string;
  players: Map<string, Player>;
  sport: Sport;
  onDelete?: (event: MatchEvent) => void;
}) {
  if (events.length === 0) return <p className="py-8 text-center text-sm text-muted">Aún no hay eventos registrados.</p>;
  return (
    <ol className="divide-y divide-line">
      {[...events].reverse().map((event) => {
        const isHome = event.teamId === homeTeamId;
        const player = event.playerId ? players.get(event.playerId) : undefined;
        const playerIn = event.playerInId ? players.get(event.playerInId) : undefined;
        const detail =
          event.type === 'SUBSTITUTION'
            ? `Sale ${playerName(player)} · entra ${playerName(playerIn)}`
            : player
              ? playerName(player)
              : 'Sin jugador';
        return (
          <li key={event.id} className={cn('flex items-center gap-3 py-3', !isHome && 'flex-row-reverse text-right')}>
            <span className="tabular w-10 shrink-0 text-center text-xs font-semibold text-muted">{event.minute}&apos;</span>
            <EventIcon type={event.type} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{eventLabel(event.type, sport, event.value)}</p>
              <p className="truncate text-xs text-muted">{detail}</p>
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event)}
                className="rounded-md p-1.5 text-subtle transition hover:bg-live-soft hover:text-live"
                aria-label="Eliminar evento"
                title="Corregir: eliminar evento"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Lineup({ team, players }: { team?: Team; players: Player[] }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-medium">
        <TeamBadge name={team?.name ?? '?'} color={team?.color} size="sm" />
        {team?.name ?? 'Equipo'}
      </p>
      <ul className="space-y-1">
        {players.map((player) => (
          <li key={player.id} className="flex items-center gap-2 text-sm text-muted">
            <span className="tabular w-6 text-right text-xs text-subtle">{player.jerseyNumber ?? '–'}</span>
            {playerName(player)}
          </li>
        ))}
        {players.length === 0 && <li className="text-sm text-subtle">Sin jugadores inscritos</li>}
      </ul>
    </div>
  );
}
