import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/** Caché JSON sobre Redis. Es "best effort": si Redis no responde, se consulta la fuente original. */
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redis.client.get(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // sin caché no pasa nada grave
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.client.del(...keys);
    } catch {
      // ignorado
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) await this.redis.client.del(...keys);
      } while (cursor !== '0');
    } catch {
      // ignorado
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return { value: cached, hit: true };
    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return { value, hit: false };
  }
}
