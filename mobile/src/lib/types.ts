/** Tipos de la API (los mismos que frontend/src/lib/types.ts de la web). */
export type Role = 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'SPECTATOR';
export type Sport = 'FOOTBALL' | 'BASKETBALL' | 'VOLLEYBALL';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'SUSPENDED';
export type LiveStatus = 'NOT_STARTED' | 'LIVE' | 'FINISHED' | 'SUSPENDED';
export type EventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt: string | null;
}

/** Respuesta de POST /auth/login y /auth/refresh con client: 'mobile'. */
export interface SessionResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
  /** Solo llega al iniciar sesión y cuando el refresh token rota. */
  refreshToken?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  zone: string;
}

export interface League {
  id: string;
  name: string;
  sport: Sport;
  city: string | null;
}

export interface LeagueDetail extends League {
  venues: Venue[];
}

export interface Team {
  id: string;
  name: string;
  leagueId: string;
  categoryId: string;
  color: string | null;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
}

export interface Match {
  id: string;
  fixtureId: string;
  seasonId: string;
  categoryId: string;
  leagueId: string;
  ownerId: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string | null;
  scheduledAt: string;
  status: MatchStatus;
  suspensionReason: string | null;
  fixtureStatus?: 'DRAFT' | 'PUBLISHED';
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: EventType;
  teamId: string;
  playerId: string | null;
  playerInId: string | null;
  minute: number;
  value: number;
  createdAt: string;
}

export interface Score {
  home: number;
  away: number;
}

export interface LiveSnapshot {
  matchId: string;
  status: LiveStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  score: Score;
  events: MatchEvent[];
  startedAt: string | null;
  finishedAt: string | null;
  attendance: number | null;
  version: number;
  viewers: number;
}

/** Elemento de GET /live/matches. */
export interface LiveMatchSummary {
  matchId: string;
  leagueId: string;
  seasonId: string;
  categoryId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: Exclude<LiveStatus, 'NOT_STARTED'>;
  startedAt: string;
  finishedAt: string | null;
  score: Score;
}

export interface ScheduledMatchProjection {
  matchId: string;
  leagueId: string;
  leagueName: string | null;
  label: string;
  scheduledAt: string;
  venueName: string | null;
  venueZone: string | null;
  round: number;
  status: string;
}

/** Elemento de GET /assignments/mine. */
export interface Assignment {
  id: string;
  matchId: string;
  refereeId: string;
  scheduledAt: string;
  confirmed: boolean;
  status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED';
  manual: boolean;
  referee?: { id: string; name: string; email: string };
  match?: ScheduledMatchProjection | null;
}

/** Elemento de GET /referees/me (perfiles de árbitro del usuario, uno por liga). */
export interface RefereeProfile {
  id: string;
  leagueId: string | null;
  name: string;
  email: string;
  zone: string;
}
