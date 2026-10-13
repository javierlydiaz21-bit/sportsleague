/**
 * Selección del árbitro para un partido (lógica pura, sin base de datos).
 * Criterios: activo, del mismo organizador, certificado en la categoría,
 * disponible en el día/horario del partido y sin cruce con otra asignación.
 * Entre los candidatos se prioriza la misma zona geográfica de la cancha y
 * luego la menor carga de partidos (reparto equitativo).
 */

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface RefereeCandidate {
  id: string;
  name: string;
  ownerId: string;
  leagueId: string | null;
  zone: string;
  categoriesCertified: string[];
  active: boolean;
  availability: AvailabilityWindow[];
}

export interface MatchSlot {
  matchId: string;
  ownerId: string;
  leagueId: string;
  categoryId: string;
  scheduledAt: Date;
  venueZone: string | null;
}

export interface BusySlot {
  refereeId: string;
  matchId: string;
  scheduledAt: Date;
}

export interface MatchingOptions {
  /** Diferencia horaria de la liga respecto a UTC, en minutos (Colombia: -300). */
  offsetMinutes: number;
  /** Duración que bloquea la agenda del árbitro. */
  matchMinutes: number;
  excludeRefereeIds?: string[];
}

export function parseOffset(offset: string): number {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

export function localParts(date: Date, offsetMinutes: number): { day: number; minutes: number } {
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  return { day: local.getUTCDay(), minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

const sameZone = (a: string | null, b: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function isAvailable(referee: RefereeCandidate, slot: MatchSlot, options: MatchingOptions): boolean {
  const { day, minutes } = localParts(slot.scheduledAt, options.offsetMinutes);
  const end = minutes + options.matchMinutes;
  return referee.availability.some(
    (window) => window.dayOfWeek === day && toMinutes(window.startTime) <= minutes && end <= toMinutes(window.endTime),
  );
}

export function rankCandidates(
  slot: MatchSlot,
  referees: RefereeCandidate[],
  busy: BusySlot[],
  options: MatchingOptions,
): RefereeCandidate[] {
  const excluded = new Set(options.excludeRefereeIds ?? []);
  const windowMs = options.matchMinutes * 60_000;
  const load = new Map<string, number>();
  for (const entry of busy) load.set(entry.refereeId, (load.get(entry.refereeId) ?? 0) + 1);

  return referees
    .filter(
      (referee) =>
        referee.active &&
        !excluded.has(referee.id) &&
        referee.ownerId === slot.ownerId &&
        (!referee.leagueId || referee.leagueId === slot.leagueId) &&
        (referee.categoriesCertified.length === 0 || referee.categoriesCertified.includes(slot.categoryId)) &&
        isAvailable(referee, slot, options) &&
        !busy.some(
          (entry) =>
            entry.refereeId === referee.id &&
            entry.matchId !== slot.matchId &&
            Math.abs(entry.scheduledAt.getTime() - slot.scheduledAt.getTime()) < windowMs,
        ),
    )
    .sort((a, b) => {
      const zone = Number(sameZone(b.zone, slot.venueZone)) - Number(sameZone(a.zone, slot.venueZone));
      return zone || (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) || a.name.localeCompare(b.name);
    });
}
