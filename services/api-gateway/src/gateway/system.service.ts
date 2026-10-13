import { Injectable } from '@nestjs/common';
import { RECENT_EVENTS_KEY, RedisService, env, serviceInfo } from '../chassis';
import { EVENT_CHANNELS, SERVICES, serviceUrls, type ServiceName } from './routes';

interface ServiceStatus {
  name: ServiceName;
  label: string;
  status: 'up' | 'degraded' | 'down';
  latencyMs: number;
  httpStatus?: number;
  version?: string;
  uptimeSeconds?: number;
  memoryMb?: number;
  checks?: Record<string, { status: string; latencyMs: number; error?: string }>;
  circuits?: { target: string; state: string; consecutiveFailures: number }[];
  subscriptions?: string[];
  error?: string;
}

/** Vista agregada para el administrador: "¿está todo bien?". */
@Injectable()
export class SystemService {
  private readonly urls = serviceUrls();
  private readonly internalToken = env('INTERNAL_API_TOKEN', 'dev-internal-token-change-me');

  constructor(private readonly redis: RedisService) {}

  async health() {
    const services = await Promise.all((Object.keys(this.urls) as ServiceName[]).map((name) => this.probe(name)));
    const redisStart = Date.now();
    const redis = await this.redis
      .ping()
      .then(() => ({ status: 'up' as const, latencyMs: Date.now() - redisStart }))
      .catch((err: Error) => ({ status: 'down' as const, latencyMs: Date.now() - redisStart, error: err.message }));
    const eventChannels = await this.channels();
    const up = services.filter((s) => s.status === 'up').length;
    return {
      checkedAt: new Date().toISOString(),
      overall: up === services.length && redis.status === 'up' ? 'ok' : up === 0 ? 'down' : 'degraded',
      summary: { up, total: services.length },
      gateway: {
        status: 'up',
        version: serviceInfo.version,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      redis,
      services,
      eventChannels,
    };
  }

  async recentEvents(limit = 50) {
    const raw = await this.redis.client.lrange(RECENT_EVENTS_KEY, 0, Math.min(limit, 200) - 1);
    return raw.flatMap((entry) => {
      try {
        return [JSON.parse(entry)];
      } catch {
        return [];
      }
    });
  }

  async tracedMatches(limit = 30) {
    const flat = await this.redis.client.zrevrange('trace:matches', 0, limit - 1, 'WITHSCORES');
    const result: { matchId: string; lastActivity: string }[] = [];
    for (let i = 0; i < flat.length; i += 2) {
      result.push({ matchId: flat[i], lastActivity: new Date(Number(flat[i + 1])).toISOString() });
    }
    return result;
  }

  /** Trazabilidad completa por match_id: el recorrido del partido por todos los microservicios. */
  async trace(matchId: string) {
    const entries = await this.redis.client.xrange(`trace:match:${matchId}`, '-', '+', 'COUNT', 1000);
    return entries.flatMap(([, fields]) => {
      const index = fields.indexOf('entry');
      if (index === -1) return [];
      try {
        return [JSON.parse(fields[index + 1])];
      } catch {
        return [];
      }
    });
  }

  private async probe(name: ServiceName): Promise<ServiceStatus> {
    const started = Date.now();
    try {
      const res = await fetch(`${this.urls[name]}/status`, {
        headers: { 'x-internal-token': this.internalToken },
        signal: AbortSignal.timeout(2500),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<ServiceStatus> & { status?: string };
      return {
        name,
        label: SERVICES[name].label,
        status: !res.ok ? 'down' : body.status === 'up' ? 'up' : 'degraded',
        latencyMs: Date.now() - started,
        httpStatus: res.status,
        version: body.version,
        uptimeSeconds: body.uptimeSeconds,
        memoryMb: body.memoryMb,
        checks: body.checks,
        circuits: body.circuits,
        subscriptions: body.subscriptions,
      };
    } catch (err) {
      return { name, label: SERVICES[name].label, status: 'down', latencyMs: Date.now() - started, error: (err as Error).message };
    }
  }

  private async channels() {
    try {
      const flat = (await this.redis.client.pubsub('NUMSUB', ...EVENT_CHANNELS)) as (string | number)[];
      const result: { channel: string; subscribers: number }[] = [];
      for (let i = 0; i < flat.length; i += 2) result.push({ channel: String(flat[i]), subscribers: Number(flat[i + 1]) });
      return result;
    } catch {
      return EVENT_CHANNELS.map((channel) => ({ channel, subscribers: -1 }));
    }
  }
}
