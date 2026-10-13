import { Injectable } from '@nestjs/common';
import { ServiceClient, env, type AuthUser } from '../chassis';
import type { Rules } from './calculator';

export interface LiveActa {
  matchId: string;
  leagueId: string;
  seasonId: string;
  categoryId: string;
  ownerId: string;
  homeTeamId: string;
  awayTeamId: string;
  version: number;
  finishedAt: string | null;
  score: { home: number; away: number };
  events: { type: string; teamId: string; playerId: string | null; value: number; minute: number }[];
}

@Injectable()
export class UpstreamClients {
  private readonly league = new ServiceClient('league-service', env('LEAGUE_SERVICE_URL', 'http://localhost:4002'), {
    timeoutMs: 2500,
  });
  private readonly live = new ServiceClient('live-score-service', env('LIVE_SCORE_SERVICE_URL', 'http://localhost:4006'), {
    timeoutMs: 4000,
  });

  /** Reglamento de puntuación de la categoría (consulta síncrona puntual). */
  rules(categoryId: string): Promise<Rules> {
    return this.league.get<Rules>(`/api/v1/categories/${categoryId}/rules`);
  }

  season(seasonId: string, user: AuthUser): Promise<{ id: string; league: { ownerId: string } }> {
    return this.league.get(`/api/v1/seasons/${seasonId}`, { user });
  }

  /** Actas oficiales del Live Score Service (para reconciliar si se perdió algún evento). */
  finishedMatches(seasonId: string, categoryId: string): Promise<LiveActa[]> {
    return this.live.get<LiveActa[]>('/api/v1/live/matches', {
      query: { seasonId, categoryId, status: 'FINISHED', includeEvents: 'true', limit: 500 },
    });
  }
}
