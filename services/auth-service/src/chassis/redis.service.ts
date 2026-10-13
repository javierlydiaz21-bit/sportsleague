import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';
import { env } from './config';
import { log } from './logger';

/**
 * Conexiones a Redis (bus de eventos, caché, rate limiting y trazas).
 * Si Redis cae, las operaciones fallan rápido y el servicio sigue atendiendo.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  private readonly connections: Redis[] = [];
  private readonly lastErrorLog = new Map<string, number>();

  constructor() {
    this.client = this.create('main');
  }

  create(label: string, overrides: RedisOptions = {}): Redis {
    const connection = new Redis(env('REDIS_URL', 'redis://localhost:6379'), {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      ...overrides,
    });
    connection.on('error', (err: Error) => {
      const now = Date.now();
      if (now - (this.lastErrorLog.get(label) ?? 0) > 10_000) {
        this.lastErrorLog.set(label, now);
        log.warn('redis_connection_error', { connection: label, error: err.message });
      }
    });
    this.connections.push(connection);
    return connection;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.connections.map((connection) => connection.quit()));
  }
}
