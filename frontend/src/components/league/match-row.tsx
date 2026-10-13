import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatDay, formatTime, MATCH_STATUS_LABEL } from '@/lib/format';
import type { LiveMatchSummary, Match, Team, Venue } from '@/lib/types';
import { effectiveStatus } from '@/lib/compose';
import { Badge, LiveBadge, TeamBadge, cn } from '../ui';

/** Fila de partido minimalista: hora · local · marcador · visitante · estado. */
export function MatchRow({
  match,
  teams,
  live,
  venues,
  href,
  trailing,
}: {
  match: Match;
  teams: Map<string, Team>;
  live?: LiveMatchSummary;
  venues?: Map<string, Venue>;
  href?: string;
  trailing?: ReactNode;
}) {
  const home = teams.get(match.homeTeamId);
  const away = teams.get(match.awayTeamId);
  const status = effectiveStatus(match, live);
  const showScore = status === 'LIVE' || status === 'FINISHED';
  const venue = match.venueId ? venues?.get(match.venueId) : undefined;

  const content = (
    <div className="grid grid-cols-[4.5rem_1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[6rem_1fr_auto_1fr_7rem]">
      <div className="text-xs leading-tight text-muted">
        <p>{formatDay(match.scheduledAt)}</p>
        <p className="tabular text-fg">{formatTime(match.scheduledAt)}</p>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-medium">{home?.name ?? 'Equipo eliminado'}</span>
        <TeamBadge name={home?.name ?? '?'} color={home?.color} size="sm" />
      </div>
      <div
        className={cn(
          'tabular min-w-14 rounded-md px-2 py-1 text-center text-sm font-semibold',
          status === 'LIVE' ? 'bg-live-soft text-live' : showScore ? 'bg-surface' : 'text-subtle',
        )}
      >
        {showScore && live ? `${live.score.home} - ${live.score.away}` : 'vs'}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <TeamBadge name={away?.name ?? '?'} color={away?.color} size="sm" />
        <span className="truncate text-sm font-medium">{away?.name ?? 'Equipo eliminado'}</span>
      </div>
      <div className="col-span-4 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
        <span className="truncate text-xs text-muted sm:hidden">{venue?.name}</span>
        {trailing ??
          (status === 'LIVE' ? (
            <LiveBadge />
          ) : status === 'SUSPENDED' ? (
            <Badge tone="amber">Suspendido</Badge>
          ) : status === 'FINISHED' ? (
            <Badge>{MATCH_STATUS_LABEL.FINISHED}</Badge>
          ) : (
            <span className="hidden truncate text-xs text-muted sm:inline">{venue?.name ?? ''}</span>
          ))}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition hover:bg-surface">
      {content}
    </Link>
  ) : (
    content
  );
}
