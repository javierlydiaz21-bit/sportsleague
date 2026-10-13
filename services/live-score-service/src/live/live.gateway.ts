import { OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { EventBus, log, type EventEnvelope } from '../chassis';
import { LiveService } from './live.service';
import { liveSubscriptions, liveUpdateLatency, wsConnections } from './metrics';
import { ViewersService } from './viewers.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SUBSCRIPTIONS_PER_SOCKET = 20;
const room = (matchId: string) => `match:${matchId}`;

interface LiveEventPayload {
  matchId: string;
  registeredAt?: string;
}

/**
 * Canal WebSocket /live: los espectadores se suscriben a un partido y reciben
 * cada gol, tarjeta o sustitución sin hacer polling.
 *
 * El registro llega por HTTP → se publica match.event en Redis → TODAS las
 * réplicas del servicio lo reciben y lo difunden a sus sockets conectados.
 */
@WebSocketGateway({ namespace: '/live' })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Namespace;

  private subscriptions = 0;

  constructor(
    private readonly live: LiveService,
    private readonly viewers: ViewersService,
    private readonly bus: EventBus,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe<LiveEventPayload>('match.event', (event) => this.relay(event, 'match:event'));
    this.bus.subscribe<LiveEventPayload>('match.event.deleted', (event) => this.relay(event, 'match:event-deleted'));
    this.bus.subscribe<LiveEventPayload>('match.started', (event) => this.pushSnapshot(event.data.matchId));
    this.bus.subscribe<LiveEventPayload>('match.completed', (event) => this.pushSnapshot(event.data.matchId));
    this.bus.subscribe<LiveEventPayload>('match.suspended', (event) => this.pushSnapshot(event.data.matchId));
  }

  handleConnection(client: Socket): void {
    client.data.matches = new Set<string>();
    wsConnections.inc();
  }

  async handleDisconnect(client: Socket): Promise<void> {
    wsConnections.dec();
    const matches = [...((client.data.matches as Set<string> | undefined) ?? [])];
    for (const matchId of matches) await this.leave(client, matchId);
  }

  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId?: string }) {
    const matchId = body?.matchId;
    if (!matchId || !UUID_RE.test(matchId)) return { ok: false, error: 'matchId inválido' };
    const joined = client.data.matches as Set<string>;
    if (!joined.has(matchId)) {
      if (joined.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) return { ok: false, error: 'Demasiadas suscripciones' };
      joined.add(matchId);
      await client.join(room(matchId));
      this.subscriptions += 1;
      liveSubscriptions.set(this.subscriptions);
      const count = await this.viewers.join(matchId);
      this.server.to(room(matchId)).emit('viewers', { matchId, count });
    }
    client.emit('match:snapshot', await this.live.snapshot(matchId));
    return { ok: true };
  }

  @SubscribeMessage('unsubscribe')
  async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId?: string }) {
    if (body?.matchId) await this.leave(client, body.matchId);
    return { ok: true };
  }

  private async leave(client: Socket, matchId: string): Promise<void> {
    const joined = client.data.matches as Set<string> | undefined;
    if (!joined?.delete(matchId)) return;
    await client.leave(room(matchId));
    this.subscriptions = Math.max(0, this.subscriptions - 1);
    liveSubscriptions.set(this.subscriptions);
    const count = await this.viewers.leave(matchId);
    this.server?.to(room(matchId)).emit('viewers', { matchId, count });
  }

  private relay(event: EventEnvelope<LiveEventPayload>, channel: string): void {
    if (!this.server) return;
    this.server.to(room(event.data.matchId)).emit(channel, event.data);
    const startedAt = Date.parse(event.data.registeredAt ?? event.occurredAt);
    if (Number.isFinite(startedAt)) liveUpdateLatency.observe(Math.max(0, Date.now() - startedAt) / 1000);
  }

  private async pushSnapshot(matchId: string): Promise<void> {
    if (!this.server) return;
    try {
      this.server.to(room(matchId)).emit('match:snapshot', await this.live.snapshot(matchId));
    } catch (err) {
      log.warn('snapshot_broadcast_failed', { matchId, error: (err as Error).message });
    }
  }
}
