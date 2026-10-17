import type { LiveSnapshot, MatchEvent, Score } from './types';

/**
 * Composición de datos en el cliente, como en la web: cada microservicio guarda solo sus datos
 * (p. ej. Fixture guarda ids de equipos, no nombres) y aquí se combinan.
 */
export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export function idsParam(ids: (string | null | undefined)[]): string {
  return [...new Set(ids.filter(Boolean))].join(',');
}

const byMinute = (a: MatchEvent, b: MatchEvent) => a.minute - b.minute || a.createdAt.localeCompare(b.createdAt);

/** Añade un evento al marcador (sin duplicarlo si ya llegó por WebSocket o por la respuesta HTTP). */
export function withEvent(prev: LiveSnapshot, event: MatchEvent, score: Score): LiveSnapshot {
  return {
    ...prev,
    status: prev.status === 'NOT_STARTED' ? 'LIVE' : prev.status,
    score,
    events: prev.events.some((e) => e.id === event.id) ? prev.events : [...prev.events, event].sort(byMinute),
  };
}

/** Quita un evento eliminado (corrección del acta). */
export function withoutEvent(prev: LiveSnapshot, eventId: string, score: Score): LiveSnapshot {
  return { ...prev, score, events: prev.events.filter((e) => e.id !== eventId) };
}
