import { UTC_OFFSET } from './config';
import type { EventType, LiveStatus, MatchStatus, Role, Sport } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  ORGANIZER: 'Organizador',
  REFEREE: 'Árbitro',
  SPECTATOR: 'Aficionado',
};

export const STATUS_LABEL: Record<MatchStatus | LiveStatus, string> = {
  SCHEDULED: 'Programado',
  NOT_STARTED: 'Programado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
  SUSPENDED: 'Suspendido',
};

/** Nombres de eventos según el deporte (en básquet un "gol" es una canasta; en vóley, un set). */
export function eventLabel(type: EventType, sport: Sport = 'FOOTBALL', value = 1): string {
  if (type === 'GOAL') {
    if (sport === 'BASKETBALL') return `Canasta +${value}`;
    if (sport === 'VOLLEYBALL') return 'Set ganado';
    return 'Gol';
  }
  return { YELLOW_CARD: 'Tarjeta amarilla', RED_CARD: 'Tarjeta roja', SUBSTITUTION: 'Sustitución' }[type];
}

export function playerName(player?: { firstName: string; lastName: string } | null): string {
  return player ? `${player.firstName} ${player.lastName}` : 'Jugador';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string' && message) return message;
  }
  return 'Ocurrió un error inesperado';
}

// ---------- Fechas ----------
// Se formatean a mano con el desfase de la liga (como la web, America/Bogota = UTC−5) para no
// depender del soporte de zonas horarias de Intl en el motor JavaScript del teléfono.

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function offsetMinutes(offset: string): number {
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(offset.trim());
  if (!match) return -300;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

const OFFSET_MS = offsetMinutes(UTC_OFFSET) * 60_000;

/** Fecha desplazada a la hora local de la liga: se leen sus campos con getUTC*. */
function local(iso: string): Date {
  return new Date(new Date(iso).getTime() + OFFSET_MS);
}

const pad = (value: number) => String(value).padStart(2, '0');
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "15:30" */
export function formatTime(iso: string): string {
  const d = local(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "Sáb, 18 oct" */
export function formatDay(iso: string): string {
  const d = local(iso);
  return upperFirst(`${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`);
}

/** "Sáb, 18 oct · 15:30" */
export function formatDateTime(iso: string): string {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}

/** Clave AAAA-MM-DD del día local (para agrupar partidos por fecha). */
export function dayKey(iso: string): string {
  const d = local(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Minuto de juego transcurrido desde el inicio (el reloj del árbitro en la web). */
export function elapsedMinute(startedAt: string | null, now: number): number {
  if (!startedAt) return 0;
  return Math.min(200, Math.max(1, Math.floor((now - new Date(startedAt).getTime()) / 60_000) + 1));
}
