/**
 * Motor de programación de calendarios (Fixture Service).
 *
 * 1. roundRobin(): genera las jornadas con el método del círculo (tablas de
 *    Berger). Cada equipo juega una vez por jornada y la localía queda
 *    equilibrada (la diferencia local/visitante de cada equipo es como máximo 1).
 * 2. scheduleRounds(): asigna fecha, cancha y hora a cada partido respetando la
 *    disponibilidad de las canchas, el descanso mínimo entre partidos de un
 *    mismo equipo y la cancha propia preferida del equipo local.
 */

export interface Pairing {
  home: string;
  away: string;
}

export interface VenueAvailability {
  id: string;
  name: string;
  zone: string;
  /** 0 = domingo ... 6 = sábado */
  availableDays: number[];
  openTime: string;
  closeTime: string;
}

export interface ScheduleOptions {
  /** 'AAAA-MM-DD' */
  startDate: string;
  /** Días de la semana en los que se programan partidos. */
  matchDays: number[];
  /** Duración de cada franja (partido + margen) en minutos. */
  slotMinutes: number;
  /** Días mínimos entre dos partidos de un mismo equipo. */
  minRestDays: number;
  /** Cancha propia preferida de cada equipo (restricción del Team Service). */
  homeVenues?: Record<string, string | null | undefined>;
  maxSearchDays?: number;
  /** Máximo de días que puede abarcar una misma jornada (p. ej. sábado y domingo). */
  roundSpreadDays?: number;
}

export interface ScheduledMatch {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  date: string;
  time: string;
}

export class SchedulingError extends Error {}

export const BYE = '__BYE__';
const DAY_MS = 86_400_000;

export function roundRobin(teamIds: string[], doubleRound = false): Pairing[][] {
  if (teamIds.length < 2) return [];
  const teams = [...teamIds];
  if (teams.length % 2 === 1) teams.push(BYE); // con número impar, un equipo descansa en cada jornada
  const n = teams.length;
  const fixed = teams[n - 1];
  const rotating = teams.slice(0, n - 1);
  const size = n - 1;
  const rounds: Pairing[][] = [];

  for (let r = 0; r < size; r += 1) {
    const round: Pairing[] = [];
    const pivot = rotating[r];
    // El equipo fijo alterna localía jornada a jornada.
    round.push(r % 2 === 0 ? { home: fixed, away: pivot } : { home: pivot, away: fixed });
    for (let i = 1; i < n / 2; i += 1) {
      round.push({ home: rotating[(r + i) % size], away: rotating[(r - i + size) % size] });
    }
    rounds.push(round.filter((pairing) => pairing.home !== BYE && pairing.away !== BYE));
  }

  if (doubleRound) {
    // Segunda vuelta: mismos cruces con la localía invertida.
    rounds.push(...rounds.map((round) => round.map((pairing) => ({ home: pairing.away, away: pairing.home }))));
  }
  return rounds;
}

export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00.000Z`) / DAY_MS);
}

export function dateFromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function weekdayOf(day: number): number {
  return new Date(day * DAY_MS).getUTCDay();
}

function minutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function hhmm(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Horas de inicio posibles en una cancha según su horario y la duración de la franja. */
export function venueSlots(venue: Pick<VenueAvailability, 'openTime' | 'closeTime'>, slotMinutes: number): string[] {
  const slots: string[] = [];
  for (let start = minutes(venue.openTime); start + slotMinutes <= minutes(venue.closeTime); start += slotMinutes) {
    slots.push(hhmm(start));
  }
  return slots;
}

export function scheduleRounds(rounds: Pairing[][], venues: VenueAvailability[], options: ScheduleOptions): ScheduledMatch[] {
  if (venues.length === 0) throw new SchedulingError('Registra al menos una cancha para generar el calendario');
  const slots = new Map(venues.map((venue) => [venue.id, venueSlots(venue, options.slotMinutes)]));
  if ([...slots.values()].every((list) => list.length === 0)) {
    throw new SchedulingError('Ninguna cancha tiene un horario suficiente para la duración de partido elegida');
  }

  const matchDays = new Set(options.matchDays);
  const openOn = (day: number) =>
    venues.filter((venue) => venue.availableDays.includes(weekdayOf(day)) && (slots.get(venue.id)?.length ?? 0) > 0);
  const playable = (day: number) => matchDays.has(weekdayOf(day)) && openOn(day).length > 0;

  const minGap = Math.max(1, options.minRestDays); // nunca dos partidos el mismo día
  const lastPlayed = new Map<string, number>();
  const rested = (team: string, day: number) => {
    const last = lastPlayed.get(team);
    return last === undefined || day - last >= minGap;
  };

  const used = new Set<string>();
  const usage = new Map<string, number>();
  const result: ScheduledMatch[] = [];
  let cursor = dayNumber(options.startDate);
  const limit = cursor + (options.maxSearchDays ?? 730);
  const spread = options.roundSpreadDays ?? 6;

  const findSlot = (day: number, pairing: Pairing) => {
    const preferred = options.homeVenues?.[pairing.home] ?? undefined;
    const candidates = openOn(day).sort((a, b) => {
      if (a.id === preferred) return -1;
      if (b.id === preferred) return 1;
      return (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) || a.name.localeCompare(b.name);
    });
    for (const venue of candidates) {
      for (const time of slots.get(venue.id) ?? []) {
        if (!used.has(`${venue.id}|${day}|${time}`)) return { venueId: venue.id, time };
      }
    }
    return undefined;
  };

  rounds.forEach((round, index) => {
    const roundNumber = index + 1;
    let start = cursor;
    while (start <= limit && !(playable(start) && round.every((p) => rested(p.home, start) && rested(p.away, start)))) {
      start += 1;
    }
    if (start > limit) throw new SchedulingError(`No se encontró una fecha disponible para la jornada ${roundNumber}`);

    let lastDay = start;
    for (const pairing of round) {
      let placed = false;
      for (let day = start; day <= start + spread && !placed; day += 1) {
        if (!playable(day) || !rested(pairing.home, day) || !rested(pairing.away, day)) continue;
        const slot = findSlot(day, pairing);
        if (!slot) continue;
        used.add(`${slot.venueId}|${day}|${slot.time}`);
        usage.set(slot.venueId, (usage.get(slot.venueId) ?? 0) + 1);
        lastPlayed.set(pairing.home, day);
        lastPlayed.set(pairing.away, day);
        lastDay = Math.max(lastDay, day);
        result.push({
          round: roundNumber,
          homeTeamId: pairing.home,
          awayTeamId: pairing.away,
          venueId: slot.venueId,
          date: dateFromDay(day),
          time: slot.time,
        });
        placed = true;
      }
      if (!placed) {
        throw new SchedulingError(
          `No hay suficientes canchas u horarios para la jornada ${roundNumber}. Agrega canchas, amplía sus horarios o habilita más días de juego.`,
        );
      }
    }
    cursor = lastDay + 1;
  });

  return result;
}

/** Fecha local de la liga (AAAA-MM-DD + HH:MM) a instante UTC. */
export function toUtc(date: string, time: string, utcOffset: string): Date {
  return new Date(`${date}T${time}:00${utcOffset}`);
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
