import { Injectable } from '@nestjs/common';
import { ServiceClient, env, type AuthUser } from '../chassis';

export interface FixtureMatch {
  id: string;
  leagueId: string;
  seasonId: string;
  categoryId: string;
  ownerId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'SUSPENDED';
  fixtureStatus: 'DRAFT' | 'PUBLISHED';
  scheduledAt: string;
}

export interface RosterPlayer {
  id: string;
  teamId: string;
}

/** Llamadas síncronas puntuales: solo al iniciar el partido y para validar permisos del árbitro. */
@Injectable()
export class UpstreamClients {
  private readonly fixture = new ServiceClient('fixture-service', env('FIXTURE_SERVICE_URL', 'http://localhost:4004'), {
    timeoutMs: 2500,
  });
  private readonly referee = new ServiceClient('referee-service', env('REFEREE_SERVICE_URL', 'http://localhost:4005'), {
    timeoutMs: 1500,
  });
  private readonly team = new ServiceClient('team-service', env('TEAM_SERVICE_URL', 'http://localhost:4003'), {
    timeoutMs: 1500,
    retries: 1,
  });

  match(matchId: string, user: AuthUser): Promise<FixtureMatch> {
    return this.fixture.get<FixtureMatch>(`/api/v1/matches/${matchId}`, { user });
  }

  refereeAssigned(matchId: string, email: string): Promise<{ assigned: boolean; refereeName: string | null }> {
    return this.referee.get('/api/v1/internal/assignments/check', { query: { matchId, email } });
  }

  roster(teamIds: string[]): Promise<RosterPlayer[]> {
    return this.team.get<RosterPlayer[]>('/api/v1/players', { query: { teamIds: teamIds.join(',') } });
  }
}
