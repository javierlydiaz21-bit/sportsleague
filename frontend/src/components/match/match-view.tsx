'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useLiveMatch } from '@/lib/live';
import type { LeagueDetail, LiveSnapshot, Match, Player, Team } from '@/lib/types';
import { ButtonLink, Card } from '../ui';
import { Lineup, Scoreboard, Timeline } from './match-parts';

/** Vista pública del partido para espectadores (se actualiza por WebSocket). */
export function MatchView({
  match,
  initial,
  teams,
  players,
  league,
}: {
  match: Match;
  initial: LiveSnapshot;
  teams: Team[];
  players: Player[];
  league: LeagueDetail | null;
}) {
  const { snapshot, connected, lastEventId } = useLiveMatch(match.id, initial);
  const { user } = useAuth();
  const home = teams.find((t) => t.id === match.homeTeamId);
  const away = teams.find((t) => t.id === match.awayTeamId);
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const venue = league?.venues.find((v) => v.id === match.venueId);
  const sport = league?.sport ?? 'FOOTBALL';
  const status = snapshot.status === 'NOT_STARTED' && match.status === 'SUSPENDED' ? 'SUSPENDED' : snapshot.status;
  const canOperate = user && (user.role === 'ADMIN' || user.id === match.ownerId || user.role === 'REFEREE');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between text-sm">
        {league ? (
          <Link href={`/ligas/${league.id}?tab=calendario`} className="text-muted hover:text-fg">
            ← {league.name}
          </Link>
        ) : (
          <span />
        )}
        {canOperate && status !== 'FINISHED' && (
          <ButtonLink href={`/panel/partidos/${match.id}`} variant="secondary" size="sm">
            Control del partido
          </ButtonLink>
        )}
      </div>

      <Scoreboard
        home={home}
        away={away}
        score={snapshot.score}
        status={status}
        scheduledAt={match.scheduledAt}
        venueName={venue?.name}
        viewers={snapshot.viewers}
        connected={connected}
        highlight={lastEventId}
        subtitle={`Jornada ${match.round}`}
      />

      {match.status === 'SUSPENDED' && match.suspensionReason && (
        <p className="text-center text-sm text-warn">Partido suspendido: {match.suspensionReason}</p>
      )}

      <Card className="px-4 sm:px-6">
        <p className="pt-4 text-sm font-semibold">Minuto a minuto</p>
        <Timeline events={snapshot.events} homeTeamId={match.homeTeamId} players={playerMap} sport={sport} />
      </Card>

      <Card className="grid gap-6 p-5 sm:grid-cols-2">
        <Lineup team={home} players={players.filter((p) => p.teamId === match.homeTeamId)} />
        <Lineup team={away} players={players.filter((p) => p.teamId === match.awayTeamId)} />
      </Card>
    </div>
  );
}
