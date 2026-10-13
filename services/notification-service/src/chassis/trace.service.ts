import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { setTraceSink, type LogEntry } from './logger';
import { RedisService } from './redis.service';

const TRACE_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Trazabilidad completa por match_id: todo log que lleve matchId se replica en
 * un Redis Stream (trace:match:<id>). El panel de administración reconstruye
 * así el recorrido de un partido por todos los microservicios.
 */
@Injectable()
export class TraceService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly redis: RedisService) {}

  onModuleInit(): void {
    if (process.env.TRACE_ENABLED === 'false') return;
    setTraceSink((entry: LogEntry) => this.store(entry));
  }

  onModuleDestroy(): void {
    setTraceSink(undefined);
  }

  private store(entry: LogEntry): void {
    const key = `trace:match:${entry.matchId}`;
    this.redis.client
      .multi()
      .xadd(key, 'MAXLEN', '~', '1000', '*', 'entry', JSON.stringify(entry))
      .expire(key, TRACE_TTL_SECONDS)
      .zadd('trace:matches', Date.now(), String(entry.matchId))
      .zremrangebyrank('trace:matches', 0, -501)
      .exec()
      .catch(() => undefined);
  }
}
