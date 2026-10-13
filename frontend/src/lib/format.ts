import { TIMEZONE, UTC_OFFSET } from './config';
import type { EventType, LeagueStatus, MatchStatus, Role, Sport } from './types';

export const SPORT_LABEL: Record<Sport, string> = { FOOTBALL: 'Fútbol', BASKETBALL: 'Básquet', VOLLEYBALL: 'Vóley' };
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  ORGANIZER: 'Organizador',
  REFEREE: 'Árbitro',
  SPECTATOR: 'Aficionado',
};
export const LEAGUE_STATUS_LABEL: Record<LeagueStatus, string> = {
  PENDING: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUSPENDED: 'Suspendida',
};
export const MATCH_STATUS_LABEL: Record<MatchStatus | 'NOT_STARTED', string> = {
  SCHEDULED: 'Programado',
  NOT_STARTED: 'Programado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
  SUSPENDED: 'Suspendido',
};
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const TIEBREAKER_LABEL: Record<string, string> = {
  GOAL_DIFFERENCE: 'Diferencia de gol',
  GOALS_FOR: 'Goles a favor',
  GOALS_AGAINST: 'Menos goles en contra',
  HEAD_TO_HEAD: 'Enfrentamiento directo',
  WINS: 'Partidos ganados',
};

/** Nombres de eventos según el deporte (en básquet un "gol" es una canasta, en vóley un set). */
export function eventLabel(type: EventType, sport: Sport = 'FOOTBALL', value = 1): string {
  if (type === 'GOAL') {
    if (sport === 'BASKETBALL') return `Canasta +${value}`;
    if (sport === 'VOLLEYBALL') return 'Set ganado';
    return 'Gol';
  }
  return { YELLOW_CARD: 'Tarjeta amarilla', RED_CARD: 'Tarjeta roja', SUBSTITUTION: 'Sustitución' }[type];
}

export function scoreWord(sport: Sport = 'FOOTBALL'): { singular: string; plural: string } {
  if (sport === 'BASKETBALL') return { singular: 'punto', plural: 'puntos' };
  if (sport === 'VOLLEYBALL') return { singular: 'set', plural: 'sets' };
  return { singular: 'gol', plural: 'goles' };
}

const dateFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE });
const dayFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TIMEZONE });
const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIMEZONE });
const dateTimeFmt = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIMEZONE,
});

/** Solo la primera letra en mayúscula ("Dom, 18 de oct"), sin capitalizar cada palabra. */
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDay = (iso: string) => upperFirst(dayFmt.format(new Date(iso)));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => upperFirst(dateTimeFmt.format(new Date(iso)));

/** Fecha 'AAAA-MM-DD' (columna DATE) mostrada sin desfase de zona horaria. */
export function formatDateOnly(value: string): string {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (Math.abs(diff) < 60) return rtf.format(-Math.round(diff), 'second');
  if (Math.abs(diff) < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}

export function uptime(seconds?: number): string {
  if (seconds === undefined) return '—';
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
  return `${Math.floor(seconds / 86400)} d ${Math.floor((seconds % 86400) / 3600)} h`;
}

/** Fecha y hora local de la liga (inputs date + time) a ISO con el desfase configurado. */
export function localToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00${UTC_OFFSET}`).toISOString();
}

/** Partes locales (AAAA-MM-DD y HH:MM) de un instante, en la zona horaria de la liga. */
export function isoToLocalParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

export function todayLocal(): string {
  return isoToLocalParts(new Date().toISOString()).date;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function playerName(player?: { firstName: string; lastName: string } | null): string {
  return player ? `${player.firstName} ${player.lastName}` : 'Jugador';
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return 'Ocurrió un error inesperado';
}
