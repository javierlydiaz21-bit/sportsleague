import { HttpException, Injectable } from '@nestjs/common';
import { CacheService, ServiceClient, env, log, type AuthUser } from '../chassis';
import type { AgeRange } from '../teams/eligibility';

export interface CategoryInfo {
  id: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  league: { id: string; name: string; sport: string; status: string; ownerId: string };
}

export interface VenueInfo {
  id: string;
  name: string;
  leagueId: string;
}

/** Comunicación síncrona (REST) con el League Service, con timeout, reintentos y circuit breaker. */
@Injectable()
export class LeagueClient {
  private readonly http = new ServiceClient('league-service', env('LEAGUE_SERVICE_URL', 'http://localhost:4002'), {
    timeoutMs: 2500,
    retries: 2,
  });

  constructor(private readonly cache: CacheService) {}

  async category(categoryId: string, user?: AuthUser): Promise<CategoryInfo> {
    const category = await this.http.get<CategoryInfo>(`/api/v1/categories/${categoryId}`, { user });
    await this.cache.set(this.rangeKey(categoryId), { minAge: category.minAge, maxAge: category.maxAge }, 86_400);
    return category;
  }

  venue(venueId: string): Promise<VenueInfo> {
    return this.http.get<VenueInfo>(`/api/v1/venues/${venueId}`);
  }

  /**
   * Rango de edad de la categoría. Si el League Service no responde se usa el
   * último valor en caché; si tampoco existe, el jugador queda "pendiente".
   */
  async ageRange(categoryId: string, user?: AuthUser): Promise<AgeRange | undefined> {
    try {
      const category = await this.category(categoryId, user);
      return { minAge: category.minAge, maxAge: category.maxAge };
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() < 500) throw err;
      const cached = await this.cache.get<AgeRange>(this.rangeKey(categoryId));
      log.warn('age_range_fallback', { categoryId, usedCache: !!cached });
      return cached;
    }
  }

  private rangeKey(categoryId: string): string {
    return `team:category-range:${categoryId}`;
  }
}
