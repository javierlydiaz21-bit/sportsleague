export interface ScoreEvent {
  type: string;
  teamId: string;
  value: number;
}

export interface Score {
  home: number;
  away: number;
}

/** El marcador se deriva siempre de los eventos (no se guarda un total acumulado). */
export function computeScore(events: ScoreEvent[], homeTeamId: string, awayTeamId: string): Score {
  const score: Score = { home: 0, away: 0 };
  for (const event of events) {
    if (event.type !== 'GOAL') continue;
    if (event.teamId === homeTeamId) score.home += event.value;
    else if (event.teamId === awayTeamId) score.away += event.value;
  }
  return score;
}

export const EVENT_TYPES = ['GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION'] as const;
export type EventTypeName = (typeof EVENT_TYPES)[number];

/** Normaliza el valor de un evento: solo los tantos pueden valer más de 1 (básquet). */
export function normalizeValue(type: EventTypeName, value?: number): number {
  if (type !== 'GOAL') return 1;
  return Math.min(3, Math.max(1, value ?? 1));
}
