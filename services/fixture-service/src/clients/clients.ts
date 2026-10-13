import { Injectable } from '@nestjs/common';
import { ServiceClient, env } from '../chassis';

export interface SeasonStructure {
  season: { id: string; leagueId: string; name: string; year: number; startDate: string; endDate: string };
  league: { id: string; name: string; sport: string; status: string; ownerId: string; ownerName?: string | null };
  categories: { id: string; name: string; minAge: number | null; maxAge: number | null }[];
  venues: { id: string; name: string; zone: string; availableDays: number[]; openTime: string; closeTime: string }[];
}

export interface TeamSummary {
  id: string;
  name: string;
  categoryId: string;
  homeVenueId: string | null;
}

/** Comunicación síncrona con el League Service (estructura de la temporada y canchas). */
@Injectable()
export class LeagueClient {
  private readonly http = new ServiceClient('league-service', env('LEAGUE_SERVICE_URL', 'http://localhost:4002'), {
    timeoutMs: 3000,
    retries: 2,
  });

  structure(seasonId: string): Promise<SeasonStructure> {
    return this.http.get<SeasonStructure>(`/api/v1/internal/seasons/${seasonId}/structure`);
  }
}

/** Comunicación síncrona con el Team Service (equipos participantes y su cancha propia). */
@Injectable()
export class TeamClient {
  private readonly http = new ServiceClient('team-service', env('TEAM_SERVICE_URL', 'http://localhost:4003'), {
    timeoutMs: 3000,
    retries: 2,
  });

  teamsOfCategory(categoryId: string): Promise<TeamSummary[]> {
    return this.http.get<TeamSummary[]>('/api/v1/teams', { query: { categoryId } });
  }
}
