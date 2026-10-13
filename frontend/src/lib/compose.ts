import type { LiveMatchSummary, Match, Player, Standing, Team } from './types';

/**
 * Composición de datos en el cliente: cada microservicio guarda solo sus datos
 * (p. ej. Fixture guarda ids de equipos, no nombres). Aquí se combinan.
 */
export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export function teamName(teams: Map<string, Team>, id: string): string {
  return teams.get(id)?.name ?? 'Equipo eliminado';
}

/** Completa la tabla con los equipos que aún no han jugado. */
export function completeStandings(standings: Standing[], teams: Team[]): Standing[] {
  const present = new Set(standings.map((s) => s.teamId));
  const missing = teams
    .filter((team) => !present.has(team.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team, index) => ({
      teamId: team.id,
      position: standings.length + index + 1,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    }));
  return [...[...standings].sort((a, b) => a.position - b.position), ...missing];
}

export function groupByRound(matches: Match[]): [number, Match[]][] {
  const rounds = new Map<number, Match[]>();
  for (const match of matches) rounds.set(match.round, [...(rounds.get(match.round) ?? []), match]);
  return [...rounds.entries()].sort(([a], [b]) => a - b);
}

/** Estado efectivo: si el Live Score ya conoce el partido, manda sobre el calendario. */
export function effectiveStatus(match: Match, live?: LiveMatchSummary): Match['status'] {
  if (!live) return match.status;
  if (live.status === 'LIVE') return 'LIVE';
  if (live.status === 'FINISHED') return 'FINISHED';
  return 'SUSPENDED';
}

export function playersById(players: Player[]): Map<string, Player> {
  return byId(players);
}

export function idsParam(ids: (string | null | undefined)[]): string {
  return [...new Set(ids.filter(Boolean))].join(',');
}
