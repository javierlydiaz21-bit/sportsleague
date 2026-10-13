/** Contratos de eventos (v1) que publica y consume el Fixture Service. */

export interface PublishedMatch {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  venueId: string | null;
  venueName: string | null;
  venueZone: string | null;
  scheduledAt: string;
}

/** fixture.published — una vez por jornada confirmada. Lo consumen Referee, Notification y Statistics. */
export interface FixturePublishedEvent {
  fixtureId: string;
  leagueId: string;
  leagueName: string;
  seasonId: string;
  categoryId: string;
  categoryName: string;
  ownerId: string;
  round: number;
  totalRounds: number;
  matches: PublishedMatch[];
}

/** match.rescheduled — cambio de horario o de sede de último momento. */
export interface MatchRescheduledEvent {
  matchId: string;
  leagueId: string;
  leagueName: string;
  seasonId: string;
  categoryId: string;
  ownerId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  previousScheduledAt: string;
  venueId: string | null;
  venueName: string | null;
  venueZone: string | null;
  previousVenueName: string | null;
}

/** match.suspended */
export interface MatchSuspendedEvent {
  matchId: string;
  leagueId: string;
  seasonId: string;
  categoryId: string;
  ownerId: string;
  homeTeamId: string;
  awayTeamId: string;
  reason: string;
  previousStatus: string;
}

/** Consumidos desde el Live Score Service. */
export interface MatchStartedEvent {
  matchId: string;
}

export interface MatchCompletedEvent {
  matchId: string;
  homeScore: number;
  awayScore: number;
}
