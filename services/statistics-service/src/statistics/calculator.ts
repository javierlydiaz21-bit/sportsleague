/**
 * Cálculo puro (sin efectos) de la tabla de posiciones, goleadores y tarjetas.
 * Al recalcular siempre desde las actas completas, el resultado es idempotente:
 * procesar dos veces el mismo evento, o una corrección del acta, nunca duplica efectos.
 */

export interface ResultInput {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  completedAt: Date;
  events: ResultEvent[];
}

export interface ResultEvent {
  type: string;
  teamId: string;
  playerId: string | null;
  value: number;
}

export interface Rules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakerCriteria: string[];
}

export interface StandingRow {
  teamId: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
}

export const DEFAULT_RULES: Rules = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakerCriteria: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
};

function emptyRow(teamId: string): StandingRow {
  return { teamId, position: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] };
}

function pointsFor(goalsFor: number, goalsAgainst: number, rules: Rules): number {
  if (goalsFor > goalsAgainst) return rules.pointsWin;
  if (goalsFor === goalsAgainst) return rules.pointsDraw;
  return rules.pointsLoss;
}

/** Puntos obtenidos solo en los partidos entre los equipos empatados (mini-liga). */
function headToHeadPoints(teamIds: Set<string>, results: ResultInput[], rules: Rules): Map<string, number> {
  const points = new Map<string, number>([...teamIds].map((id) => [id, 0]));
  for (const r of results) {
    if (!teamIds.has(r.homeTeamId) || !teamIds.has(r.awayTeamId)) continue;
    points.set(r.homeTeamId, (points.get(r.homeTeamId) ?? 0) + pointsFor(r.homeScore, r.awayScore, rules));
    points.set(r.awayTeamId, (points.get(r.awayTeamId) ?? 0) + pointsFor(r.awayScore, r.homeScore, rules));
  }
  return points;
}

function criterionKey(criterion: string, group: StandingRow[], results: ResultInput[], rules: Rules): Map<string, number> {
  switch (criterion) {
    case 'GOAL_DIFFERENCE':
      return new Map(group.map((row) => [row.teamId, row.goalDifference]));
    case 'GOALS_FOR':
      return new Map(group.map((row) => [row.teamId, row.goalsFor]));
    case 'GOALS_AGAINST':
      return new Map(group.map((row) => [row.teamId, -row.goalsAgainst])); // menos goles en contra es mejor
    case 'WINS':
      return new Map(group.map((row) => [row.teamId, row.wins]));
    case 'HEAD_TO_HEAD':
      return headToHeadPoints(new Set(group.map((row) => row.teamId)), results, rules);
    default:
      return new Map(group.map((row) => [row.teamId, 0]));
  }
}

/** Ordena un grupo empatado aplicando los criterios de desempate en cascada. */
function rankGroup(group: StandingRow[], criteria: string[], results: ResultInput[], rules: Rules): StandingRow[] {
  if (group.length <= 1) return group;
  if (criteria.length === 0) return [...group].sort((a, b) => a.teamId.localeCompare(b.teamId));
  const [criterion, ...rest] = criteria;
  const key = criterionKey(criterion, group, results, rules);
  const sorted = [...group].sort((a, b) => (key.get(b.teamId) ?? 0) - (key.get(a.teamId) ?? 0));
  const ranked: StandingRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && key.get(sorted[j].teamId) === key.get(sorted[i].teamId)) j += 1;
    ranked.push(...rankGroup(sorted.slice(i, j), rest, results, rules));
    i = j;
  }
  return ranked;
}

export function computeStandings(teamIds: string[], results: ResultInput[], rules: Rules): StandingRow[] {
  const rows = new Map<string, StandingRow>(teamIds.map((id) => [id, emptyRow(id)]));
  const ordered = [...results].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  for (const r of ordered) {
    const home = rows.get(r.homeTeamId) ?? emptyRow(r.homeTeamId);
    const away = rows.get(r.awayTeamId) ?? emptyRow(r.awayTeamId);
    rows.set(home.teamId, home);
    rows.set(away.teamId, away);
    for (const [row, gf, ga] of [
      [home, r.homeScore, r.awayScore],
      [away, r.awayScore, r.homeScore],
    ] as const) {
      row.played += 1;
      row.goalsFor += gf;
      row.goalsAgainst += ga;
      if (gf > ga) {
        row.wins += 1;
        row.form.unshift('G');
      } else if (gf === ga) {
        row.draws += 1;
        row.form.unshift('E');
      } else {
        row.losses += 1;
        row.form.unshift('P');
      }
      row.points += pointsFor(gf, ga, rules);
    }
  }

  const all = [...rows.values()].map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst, form: row.form.slice(0, 5) }));
  // Primero por puntos; cada grupo empatado se desempata con el reglamento de la categoría.
  const byPoints = new Map<number, StandingRow[]>();
  for (const row of all) byPoints.set(row.points, [...(byPoints.get(row.points) ?? []), row]);
  const ranked = [...byPoints.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, group]) => rankGroup(group, rules.tiebreakerCriteria, results, rules));
  return ranked.map((row, index) => ({ ...row, position: index + 1 }));
}

export interface ScorerRow {
  playerId: string;
  teamId: string;
  goals: number;
}

export function computeTopScorers(results: ResultInput[]): ScorerRow[] {
  const goals = new Map<string, ScorerRow>();
  for (const r of results) {
    for (const e of r.events) {
      if (e.type !== 'GOAL' || !e.playerId) continue;
      const row = goals.get(e.playerId) ?? { playerId: e.playerId, teamId: e.teamId, goals: 0 };
      row.goals += e.value ?? 1;
      goals.set(e.playerId, row);
    }
  }
  return [...goals.values()].sort((a, b) => b.goals - a.goals || a.playerId.localeCompare(b.playerId));
}

export interface DisciplineRow {
  playerId: string;
  teamId: string;
  yellowCards: number;
  redCards: number;
}

export function computeDiscipline(results: ResultInput[]): DisciplineRow[] {
  const cards = new Map<string, DisciplineRow>();
  for (const r of results) {
    for (const e of r.events) {
      if ((e.type !== 'YELLOW_CARD' && e.type !== 'RED_CARD') || !e.playerId) continue;
      const row = cards.get(e.playerId) ?? { playerId: e.playerId, teamId: e.teamId, yellowCards: 0, redCards: 0 };
      if (e.type === 'YELLOW_CARD') row.yellowCards += 1;
      else row.redCards += 1;
      cards.set(e.playerId, row);
    }
  }
  return [...cards.values()].sort((a, b) => b.redCards - a.redCards || b.yellowCards - a.yellowCards);
}
