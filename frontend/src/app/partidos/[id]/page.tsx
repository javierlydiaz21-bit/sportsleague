import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { MatchView } from '@/components/match/match-view';
import { safeGet, serverGet } from '@/lib/server';
import type { LeagueDetail, LiveSnapshot, Match, Player, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

/** Memoizado por solicitud: generateMetadata y la página comparten las mismas lecturas. */
const load = cache(async (id: string) => {
  const match = await serverGet<Match>(`/matches/${id}`).catch(() => null);
  if (!match) return null;
  const teamIds = `${match.homeTeamId},${match.awayTeamId}`;
  const [snapshot, teams, players, league] = await Promise.all([
    safeGet<LiveSnapshot | null>(`/matches/${id}/live`, null),
    safeGet<Team[]>(`/teams?ids=${teamIds}`, []),
    safeGet<Player[]>(`/players?teamIds=${teamIds}`, []),
    safeGet<LeagueDetail | null>(`/leagues/${match.leagueId}`, null),
  ]);
  return { match, snapshot, teams, players, league };
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const data = await load(id);
  if (!data) return { title: 'Partido' };
  const home = data.teams.find((t) => t.id === data.match.homeTeamId)?.name ?? 'Local';
  const away = data.teams.find((t) => t.id === data.match.awayTeamId)?.name ?? 'Visitante';
  const score = data.snapshot && data.snapshot.status !== 'NOT_STARTED' ? ` ${data.snapshot.score.home}-${data.snapshot.score.away} ` : ' vs ';
  return { title: `${home}${score}${away}`, description: `${data.league?.name ?? 'SportsLeague'} · Jornada ${data.match.round}` };
}

export default async function MatchPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  const initial: LiveSnapshot = data.snapshot ?? {
    matchId: id,
    status: 'NOT_STARTED',
    homeTeamId: data.match.homeTeamId,
    awayTeamId: data.match.awayTeamId,
    score: { home: 0, away: 0 },
    events: [],
    startedAt: null,
    finishedAt: null,
    attendance: null,
    version: 0,
    viewers: 0,
  };
  return <MatchView match={data.match} initial={initial} teams={data.teams} players={data.players} league={data.league} />;
}
