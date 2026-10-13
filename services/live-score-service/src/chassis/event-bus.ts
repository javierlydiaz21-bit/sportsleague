import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { serviceInfo } from './config';
import { log } from './logger';
import { eventsConsumedTotal, eventsPublishedTotal } from './metrics';
import { RedisService } from './redis.service';
import { currentContext, requestContext } from './request-context';

/** Sobre (envelope) versionado de todos los eventos de dominio. */
export interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  version: number;
  source: string;
  occurredAt: string;
  requestId?: string;
  data: T;
}

/** El valor de retorno del manejador se ignora (puede ser async). */
export type EventHandler<T = unknown> = (event: EventEnvelope<T>) => unknown;

export interface PublishOptions {
  version?: number;
}

/**
 * Abstracción del bus de eventos (DIP / LSP): los servicios dependen de esta
 * clase abstracta y no de Redis. Cualquier implementación (Redis, memoria, un
 * broker distinto) puede sustituirse sin tocar a productores ni consumidores.
 */
export abstract class EventBus {
  abstract publish<T>(type: string, data: T, options?: PublishOptions): Promise<EventEnvelope<T>>;
  abstract subscribe<T>(type: string, handler: EventHandler<T>): void;
  abstract subscribedTypes(): string[];
}

export const RECENT_EVENTS_KEY = 'events:recent';

export function buildEnvelope<T>(type: string, data: T, options?: PublishOptions): EventEnvelope<T> {
  return {
    id: randomUUID(),
    type,
    version: options?.version ?? 1,
    source: serviceInfo.name,
    occurredAt: new Date().toISOString(),
    requestId: currentContext()?.requestId,
    data,
  };
}

function matchIdOf(envelope: EventEnvelope): string | undefined {
  const data = envelope.data as { matchId?: unknown } | null;
  return typeof data?.matchId === 'string' ? data.matchId : undefined;
}

/** Ejecuta los manejadores de un evento aislando errores (un manejador que falla no tumba al resto). */
export async function dispatch(handlers: EventHandler[], envelope: EventEnvelope): Promise<void> {
  const matchId = matchIdOf(envelope);
  for (const handler of handlers) {
    try {
      await requestContext.run({ requestId: envelope.requestId ?? envelope.id, matchId }, async () => {
        await handler(envelope);
        log.info('event_consumed', { eventType: envelope.type, eventId: envelope.id, from: envelope.source });
      });
      eventsConsumedTotal.inc({ type: envelope.type, outcome: 'ok' });
    } catch (err) {
      eventsConsumedTotal.inc({ type: envelope.type, outcome: 'error' });
      log.error('event_handler_failed', {
        eventType: envelope.type,
        eventId: envelope.id,
        matchId,
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
    }
  }
}

/**
 * Implementación sobre Redis Pub/Sub. Prioriza baja latencia sobre garantía de
 * entrega (como define la arquitectura): si un evento se pierde, los servicios
 * tienen mecanismos de recálculo idempotente a partir del acta oficial.
 */
@Injectable()
export class RedisEventBus extends EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();
  /** Cola por canal: los mensajes de un mismo canal se procesan en el orden en que llegaron. */
  private readonly queues = new Map<string, Promise<void>>();
  private readonly subscriber: Redis;

  constructor(private readonly redis: RedisService) {
    super();
    this.subscriber = redis.create('subscriber', { maxRetriesPerRequest: null });
    this.subscriber.on('message', (channel: string, raw: string) => {
      const previous = this.queues.get(channel) ?? Promise.resolve();
      const next = previous.then(() => this.onMessage(channel, raw)).catch(() => undefined);
      this.queues.set(channel, next);
    });
  }

  async publish<T>(type: string, data: T, options?: PublishOptions): Promise<EventEnvelope<T>> {
    const envelope = buildEnvelope(type, data, options);
    const raw = JSON.stringify(envelope);
    const matchId = matchIdOf(envelope);
    try {
      await this.redis.client
        .multi()
        .publish(type, raw)
        .lpush(RECENT_EVENTS_KEY, raw)
        .ltrim(RECENT_EVENTS_KEY, 0, 199)
        .exec();
      eventsPublishedTotal.inc({ type });
      log.info('event_published', { eventType: type, eventId: envelope.id, ...(matchId ? { matchId } : {}) });
    } catch (err) {
      // No se relanza: el registro principal ya ocurrió y el evento puede reconciliarse luego.
      log.error('event_publish_failed', { eventType: type, eventId: envelope.id, error: (err as Error).message });
    }
    return envelope;
  }

  subscribe<T>(type: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(type, list);
    if (list.length === 1) {
      this.subscriber.subscribe(type).catch((err: Error) => {
        log.error('event_subscribe_failed', { eventType: type, error: err.message });
      });
    }
  }

  subscribedTypes(): string[] {
    return [...this.handlers.keys()];
  }

  private async onMessage(channel: string, raw: string): Promise<void> {
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(raw) as EventEnvelope;
    } catch {
      log.warn('event_malformed', { channel });
      return;
    }
    await dispatch(this.handlers.get(channel) ?? [], envelope);
  }
}

/** Implementación en memoria: útil para pruebas (sustituible gracias a la abstracción). */
export class InMemoryEventBus extends EventBus {
  readonly published: EventEnvelope[] = [];
  private readonly handlers = new Map<string, EventHandler[]>();

  async publish<T>(type: string, data: T, options?: PublishOptions): Promise<EventEnvelope<T>> {
    const envelope = buildEnvelope(type, data, options);
    this.published.push(envelope);
    await dispatch(this.handlers.get(type) ?? [], envelope);
    return envelope;
  }

  subscribe<T>(type: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(type, list);
  }

  subscribedTypes(): string[] {
    return [...this.handlers.keys()];
  }
}
