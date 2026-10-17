import type { Api } from './auth';
import type { LeagueDetail, LiveSnapshot, Match, Player, Team } from './types';

export interface MatchData {
  match: Match;
  teams: Team[];
  players: Player[];
  league: LeagueDetail | null;
  snapshot: LiveSnapshot;
}

function emptySnapshot(match: Match): LiveSnapshot {
  return {
    matchId: match.id,
    status: 'NOT_STARTED',
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    score: { home: 0, away: 0 },
    events: [],
    startedAt: null,
    finishedAt: null,
    attendance: null,
    version: 0,
    viewers: 0,
  };
}

/**
 * Las mismas lecturas que la web (frontend/src/app/partidos/[id]/page.tsx y match-control.tsx):
 * el partido (Fixture), los equipos y jugadores (Team), la liga (League) y el marcador (Live Score).
 * En modo estricto (control del árbitro) falla si no se puede leer el marcador, para no ofrecer
 * «Iniciar partido» sobre un partido que ya está en curso.
 */
export async function loadMatchData(api: Api, id: string, strict = false): Promise<MatchData> {
  const match = await api.get<Match>(`/matches/${id}`);
  const teamIds = `${match.homeTeamId},${match.awayTeamId}`;
  const optional = <T,>(promise: Promise<T>, fallback: T) => (strict ? promise : promise.catch(() => fallback));
  const [teams, players, league, snapshot] = await Promise.all([
    optional(api.get<Team[]>(`/teams?ids=${teamIds}`), []),
    optional(api.get<Player[]>(`/players?teamIds=${teamIds}`), []),
    api.get<LeagueDetail>(`/leagues/${match.leagueId}`).catch(() => null),
    optional(api.get<LiveSnapshot>(`/matches/${id}/live`), emptySnapshot(match)),
  ]);
  return { match, teams, players, league, snapshot };
}
