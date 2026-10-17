import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Counter } from 'prom-client';
import { EventBus, ServiceClient, env, log, registry, traceMatch, type AuthUser, type EventEnvelope } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import { Mailer } from './mailer';
import {
  finalResult,
  leagueCreated,
  leagueReviewed,
  matchRescheduled,
  matchSuspended,
  refereeAssigned,
  refereeUnassigned,
  roundPublished,
  userRegistered,
  type Message,
} from './templates';

const notificationsCreated = new Counter({
  name: 'notifications_created_total',
  help: 'Notificaciones generadas por tipo',
  labelNames: ['type'] as const,
  registers: [registry],
});
const deliveriesTotal = new Counter({
  name: 'notification_deliveries_total',
  help: 'Envíos por canal externo y resultado (SENT, FAILED o SIMULATED)',
  labelNames: ['channel', 'status'] as const,
  registers: [registry],
});

interface Recipient {
  userId?: string;
  email?: string;
  role?: string;
}

type AnyEvent = EventEnvelope<any>;

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly teams = new ServiceClient('team-service', env('TEAM_SERVICE_URL', 'http://localhost:4003'), { timeoutMs: 2000 });
  private readonly webUrl = env('WEB_URL', 'http://localhost:3000');

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
    private readonly mailer: Mailer,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe('league.created', (e: AnyEvent) => this.notify(e, [{ role: 'ADMIN' }], leagueCreated(e.data)));
    this.bus.subscribe('league.reviewed', (e: AnyEvent) => this.notify(e, [{ userId: e.data.ownerId }], leagueReviewed(e.data)));
    this.bus.subscribe('user.registered', (e: AnyEvent) => this.notify(e, [{ role: 'ADMIN' }], userRegistered(e.data)));
    this.bus.subscribe('fixture.published', (e: AnyEvent) => this.toLeagueAudience(e, roundPublished(e.data)));
    this.bus.subscribe('referee.assigned', (e: AnyEvent) =>
      this.notify(e, [{ email: e.data.refereeEmail }], refereeAssigned(e.data), [e.data.refereeEmail]),
    );
    this.bus.subscribe('referee.unassigned', (e: AnyEvent) => this.notify(e, [{ userId: e.data.ownerId }], refereeUnassigned(e.data)));
    this.bus.subscribe('match.rescheduled', (e: AnyEvent) => this.toLeagueAudience(e, matchRescheduled(e.data)));
    this.bus.subscribe('match.suspended', (e: AnyEvent) => this.onMatchSuspended(e));
    this.bus.subscribe('match.completed', (e: AnyEvent) => this.onMatchCompleted(e));
  }

  // ---------- Consumidores ----------

  async onMatchSuspended(event: AnyEvent): Promise<void> {
    const names = await this.teamNames([event.data.homeTeamId, event.data.awayTeamId]);
    const label = `${names.get(event.data.homeTeamId) ?? 'Local'} vs ${names.get(event.data.awayTeamId) ?? 'Visitante'}`;
    await this.toLeagueAudience(event, matchSuspended(event.data, label));
  }

  async onMatchCompleted(event: AnyEvent): Promise<void> {
    const names = await this.teamNames([event.data.homeTeamId, event.data.awayTeamId]);
    const message = finalResult(event.data, names.get(event.data.homeTeamId) ?? 'Local', names.get(event.data.awayTeamId) ?? 'Visitante');
    await this.toLeagueAudience(event, message);
  }

  /** Organizador de la liga + aficionados que la siguen (correo solo a quienes no lo desactivaron). */
  async toLeagueAudience(event: AnyEvent, message: Message): Promise<void> {
    const subscriptions = await this.prisma.subscription.findMany({ where: { leagueId: event.data.leagueId } });
    const userIds = new Set<string>([event.data.ownerId, ...subscriptions.map((s) => s.userId)].filter(Boolean));
    const noEmail = await this.optedOut(subscriptions.map((s) => s.userId), 'email');
    await this.notify(
      event,
      [...userIds].map((userId) => ({ userId })),
      message,
      subscriptions.filter((s) => !noEmail.has(s.userId)).map((s) => s.email),
    );
  }

  /** Usuarios que desactivaron un canal en sus preferencias. */
  private async optedOut(userIds: string[], channel: 'email' | 'push'): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.prisma.preference.findMany({
      where: { userId: { in: userIds }, ...(channel === 'email' ? { emailEnabled: false } : { pushEnabled: false }) },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  }

  /** Crea las notificaciones (idempotente gracias a dedupeKey) y registra los envíos externos. */
  async notify(event: AnyEvent, recipients: Recipient[], message: Message, emails: string[] = []): Promise<number> {
    const rows: Prisma.NotificationCreateManyInput[] = recipients
      .filter((r) => r.userId || r.email || r.role)
      .map((recipient) => ({
        ...recipient,
        email: recipient.email?.toLowerCase(),
        type: message.type,
        title: message.title,
        body: message.body,
        link: message.link ?? null,
        eventId: event.id,
        dedupeKey: `${event.id}:${recipient.userId ?? recipient.email?.toLowerCase() ?? recipient.role}`,
      }));
    if (rows.length === 0) return 0;
    const created = await this.prisma.notification.createMany({ data: rows, skipDuplicates: true });
    if (created.count === 0) return 0; // evento repetido: ya se notificó
    notificationsCreated.inc({ type: message.type }, created.count);

    const emailRecipients = [...new Set(emails.filter(Boolean).map((e) => e.toLowerCase()))];
    const emailStatuses = await Promise.all(emailRecipients.map((to) => this.mailer.send(to, message.title, this.mailBody(message))));
    const pushUsers = rows.filter((row) => row.userId).map((row) => row.userId as string);
    const noPush = await this.optedOut(pushUsers, 'push');
    const deliveries = [
      ...emailRecipients.map((recipient, i) => ({ channel: 'EMAIL', recipient, subject: message.title, status: emailStatuses[i] })),
      ...pushUsers
        .filter((userId) => !noPush.has(userId))
        .map((userId) => ({ channel: 'PUSH', recipient: userId, subject: message.title, status: 'SIMULATED' })),
    ];
    if (deliveries.length) {
      await this.prisma.delivery.createMany({ data: deliveries });
      for (const delivery of deliveries) deliveriesTotal.inc({ channel: delivery.channel, status: delivery.status });
    }
    const matchId = typeof event.data?.matchId === 'string' ? event.data.matchId : undefined;
    if (matchId) traceMatch(matchId, 'notifications_sent', { type: message.type, recipients: created.count });
    else log.info('notifications_sent', { type: message.type, recipients: created.count, eventType: event.type });
    return created.count;
  }

  private mailBody(message: Message): string {
    return message.link ? `${message.body}\n\nVer en SportsLeague: ${this.webUrl}${message.link}` : message.body;
  }

  // ---------- API ----------

  private audience(user: AuthUser): Prisma.NotificationWhereInput {
    return { OR: [{ userId: user.id }, { email: user.email.toLowerCase() }, { role: user.role }] };
  }

  async inbox(user: AuthUser, limit = 50) {
    const where = this.audience(user);
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 100) }),
      this.prisma.notification.count({ where: { AND: [where, { read: false }] } }),
    ]);
    return { items, unread };
  }

  /** Vista del administrador sobre las notificaciones dirigidas a un usuario concreto. */
  async inboxOf(userId: string, limit = 50) {
    const where = { userId };
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 100) }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, unread };
  }

  unreadCount(user: AuthUser) {
    return this.prisma.notification.count({ where: { AND: [this.audience(user), { read: false }] } }).then((unread) => ({ unread }));
  }

  async markRead(id: string, user: AuthUser) {
    const result = await this.prisma.notification.updateMany({ where: { AND: [{ id }, this.audience(user)] }, data: { read: true } });
    if (result.count === 0) throw new NotFoundException('Notificación no encontrada');
    return { ok: true };
  }

  async markAllRead(user: AuthUser) {
    const result = await this.prisma.notification.updateMany({ where: { AND: [this.audience(user), { read: false }] }, data: { read: true } });
    return { updated: result.count };
  }

  async preferences(user: AuthUser) {
    return (await this.prisma.preference.findUnique({ where: { userId: user.id } })) ?? { userId: user.id, emailEnabled: true, pushEnabled: true };
  }

  updatePreferences(user: AuthUser, data: { emailEnabled?: boolean; pushEnabled?: boolean }) {
    return this.prisma.preference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  }

  async test(user: AuthUser) {
    const created = await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TEST',
        title: 'Notificación de prueba',
        body: 'El Notification Service está funcionando correctamente.',
        eventId: `test-${Date.now()}`,
        dedupeKey: `test-${user.id}-${Date.now()}`,
      },
    });
    const emailStatus = await this.mailer.send(user.email, created.title, created.body);
    await this.prisma.delivery.createMany({
      data: [
        { channel: 'PUSH', recipient: user.id, subject: created.title, status: 'SIMULATED' },
        { channel: 'EMAIL', recipient: user.email.toLowerCase(), subject: created.title, status: emailStatus },
      ],
    });
    return { ...created, emailStatus };
  }

  deliveries(limit = 100) {
    return this.prisma.delivery.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200) });
  }

  // ---------- Suscripciones (seguir una liga) ----------

  subscribe(leagueId: string, user: AuthUser) {
    return this.prisma.subscription.upsert({
      where: { userId_leagueId: { userId: user.id, leagueId } },
      create: { userId: user.id, email: user.email.toLowerCase(), leagueId },
      update: {},
    });
  }

  async unsubscribe(leagueId: string, user: AuthUser) {
    await this.prisma.subscription.deleteMany({ where: { userId: user.id, leagueId } });
    return { ok: true };
  }

  mySubscriptions(user: AuthUser) {
    return this.prisma.subscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  }

  async followers(leagueId: string) {
    return { leagueId, followers: await this.prisma.subscription.count({ where: { leagueId } }) };
  }

  private async teamNames(ids: string[]): Promise<Map<string, string>> {
    try {
      const teams = await this.teams.get<{ id: string; name: string }[]>('/api/v1/teams', { query: { ids: ids.join(',') } });
      return new Map(teams.map((t) => [t.id, t.name]));
    } catch {
      return new Map(); // el aviso sale igual, con nombres genéricos
    }
  }
}
