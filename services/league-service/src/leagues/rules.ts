import type { LeagueStatus, Sport } from '@prisma/client';

export const TIEBREAKERS = ['GOAL_DIFFERENCE', 'GOALS_FOR', 'GOALS_AGAINST', 'HEAD_TO_HEAD', 'WINS'] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export interface RuleSet {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakerCriteria: Tiebreaker[];
}

/** Reglamento por defecto según el deporte (el organizador puede personalizarlo). */
export function defaultRules(sport: Sport): RuleSet {
  switch (sport) {
    case 'BASKETBALL':
      // FIBA: 2 puntos por victoria, 1 por derrota; no hay empates.
      return { pointsWin: 2, pointsDraw: 0, pointsLoss: 1, tiebreakerCriteria: ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE', 'GOALS_FOR'] };
    case 'VOLLEYBALL':
      return { pointsWin: 3, pointsDraw: 0, pointsLoss: 0, tiebreakerCriteria: ['WINS', 'GOAL_DIFFERENCE', 'GOALS_FOR'] };
    case 'FOOTBALL':
    default:
      return { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakerCriteria: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'] };
  }
}

/** Transiciones permitidas en la revisión administrativa de una liga. */
const REVIEW_TRANSITIONS: Record<LeagueStatus, LeagueStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
  REJECTED: ['APPROVED'],
  SUSPENDED: ['APPROVED'],
};

export function canTransition(from: LeagueStatus, to: LeagueStatus): boolean {
  return REVIEW_TRANSITIONS[from].includes(to);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function minutesOf(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Convierte 'AAAA-MM-DD' en una fecha UTC a medianoche (columna DATE de PostgreSQL). */
export function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
