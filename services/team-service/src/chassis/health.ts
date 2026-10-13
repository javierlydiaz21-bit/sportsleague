import { Controller, Get, Injectable, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OpenEndpoint, Public } from './auth-context';
import { serviceInfo } from './config';
import { EventBus } from './event-bus';
import { registry } from './metrics';
import { RedisService } from './redis.service';
import { breakers } from './service-client';

type CheckFn = () => Promise<unknown>;

export interface CheckResult {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout (${ms} ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Cada servicio registra aquí sus dependencias críticas (base de datos, Redis...). */
@Injectable()
export class HealthRegistry {
  private readonly checks = new Map<string, CheckFn>();

  constructor(redis: RedisService) {
    this.register('redis', () => redis.ping());
  }

  register(name: string, check: CheckFn): void {
    this.checks.set(name, check);
  }

  async run(timeoutMs = 2000): Promise<{ ok: boolean; checks: Record<string, CheckResult> }> {
    const results = await Promise.all(
      [...this.checks.entries()].map(async ([name, check]): Promise<[string, CheckResult]> => {
        const start = Date.now();
        try {
          await withTimeout(check(), timeoutMs);
          return [name, { status: 'up', latencyMs: Date.now() - start }];
        } catch (err) {
          return [name, { status: 'down', latencyMs: Date.now() - start, error: (err as Error).message }];
        }
      }),
    );
    return { ok: results.every(([, result]) => result.status === 'up'), checks: Object.fromEntries(results) };
  }
}

/** /health (Render lo usa para los rolling updates), /status (detalle) y /metrics (Prometheus). */
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthRegistry,
    private readonly bus: EventBus,
  ) {}

  @OpenEndpoint()
  @Get('health')
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.health.run();
    res.status(result.ok ? 200 : 503);
    return { status: result.ok ? 'ok' : 'degraded', service: serviceInfo.name, checks: result.checks };
  }

  @Public()
  @Get('status')
  async status() {
    const result = await this.health.run();
    const memory = process.memoryUsage();
    return {
      service: serviceInfo.name,
      version: serviceInfo.version,
      status: result.ok ? 'up' : 'degraded',
      startedAt: serviceInfo.startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      node: process.version,
      memoryMb: Math.round(memory.rss / 1024 / 1024),
      checks: result.checks,
      circuits: [...breakers.values()].map((breaker) => breaker.snapshot()),
      subscriptions: this.bus.subscribedTypes(),
    };
  }

  @OpenEndpoint()
  @Get('metrics')
  async metrics(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  }
}
