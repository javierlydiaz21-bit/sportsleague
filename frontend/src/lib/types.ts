export type Role = 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'SPECTATOR';
export type Sport = 'FOOTBALL' | 'BASKETBALL' | 'VOLLEYBALL';
export type LeagueStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'SUSPENDED';
export type LiveStatus = 'NOT_STARTED' | 'LIVE' | 'FINISHED' | 'SUSPENDED';
export type EventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
export type Eligibility = 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Rules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakerCriteria: string[];
}

export interface Season {
  id: string;
  leagueId: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
}

export interface Category {
  id: string;
  leagueId: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  rules: Rules | null;
}

export interface Venue {
  id: string;
  leagueId: string;
  name: string;
  address: string | null;
  zone: string;
  availableDays: number[];
  openTime: string;
  closeTime: string;
}

export interface League {
  id: string;
  name: string;
  sport: Sport;
  description: string | null;
  city: string | null;
  ownerId: string;
  ownerName: string | null;
  status: LeagueStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  _count?: { seasons: number; categories: number; venues: number };
}

export interface LeagueDetail extends League {
  seasons: Season[];
  categories: Category[];
  venues: Venue[];
}

export interface Team {
  id: string;
  name: string;
  leagueId: string;
  categoryId: string;
  ownerId: string;
  homeVenueId: string | null;
  coachName: string | null;
  contactEmail: string | null;
  color: string | null;
  _count?: { players: number };
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  jerseyNumber: number | null;
  position: string | null;
  documentId?: string | null;
  eligibilityStatus: Eligibility;
  eligibilityNote: string | null;
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

export interface Fixture {
  id: string;
  seasonId: string;
  categoryId: string;
  leagueId: string;
  ownerId: string;
  status: 'DRAFT' | 'PUBLISHED';
  doubleRound: boolean;
  totalRounds: number;
  config: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  matches: Match[];
  warnings?: string[];
  lastDate?: string;
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

export interface Standing {
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

export interface TopScorer {
  playerId: string;
  teamId: string;
  goals: number;
}

export interface DisciplinaryRecord {
  playerId: string;
  teamId: string;
  yellowCards: number;
  redCards: number;
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Referee {
  id: string;
  ownerId: string;
  leagueId: string | null;
  name: string;
  email: string;
  phone: string | null;
  zone: string;
  categoriesCertified: string[];
  active: boolean;
  availability: AvailabilityWindow[];
  _count?: { assignments: number };
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

export interface Assignment {
  id: string;
  matchId: string;
  refereeId: string;
  scheduledAt: string;
  confirmed: boolean;
  status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED';
  manual: boolean;
  referee?: { id: string; name: string; email: string; zone?: string };
  match?: ScheduledMatchProjection | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ServiceHealth {
  name: string;
  label: string;
  status: 'up' | 'degraded' | 'down';
  latencyMs: number;
  version?: string;
  uptimeSeconds?: number;
  memoryMb?: number;
  checks?: Record<string, { status: string; latencyMs: number; error?: string }>;
  circuits?: { target: string; state: string; consecutiveFailures: number }[];
  subscriptions?: string[];
  error?: string;
}

export interface SystemHealth {
  checkedAt: string;
  overall: 'ok' | 'degraded' | 'down';
  summary: { up: number; total: number };
  gateway: { status: string; uptimeSeconds: number; memoryMb: number; version: string };
  redis: { status: string; latencyMs: number; error?: string };
  services: ServiceHealth[];
  eventChannels: { channel: string; subscribers: number }[];
}

export interface DomainEvent {
  id: string;
  type: string;
  version: number;
  source: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

export interface TraceEntry {
  ts: string;
  level: string;
  service: string;
  msg: string;
  matchId: string;
  [key: string]: unknown;
}

export interface LeagueKpi {
  leagueId: string;
  ownerId: string;
  totalMatches: number;
  scheduled: number;
  live: number;
  finished: number;
  suspended: number;
  totalGoals: number;
  totalCards: number;
  avgGoalsPerMatch: number;
  avgAttendance: number;
  computedAt: string;
}

export interface EtlRun {
  id: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  rowsProcessed: number;
  error: string | null;
}
