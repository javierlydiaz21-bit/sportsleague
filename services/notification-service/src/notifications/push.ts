import { Injectable } from '@nestjs/common';
import * as webpush from 'web-push';
import { env, log } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';

export type PushStatus = 'SENT' | 'FAILED' | 'SIMULATED';

export interface PushMessage {
  title: string;
  body: string;
  link?: string | null;
}

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Notificaciones push reales con Web Push, el estándar de los navegadores (sin proveedor de pago): cada
 * navegador suscrito recibe el aviso aunque la web esté cerrada. Sin VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY,
 * o si el usuario no tiene navegadores suscritos, el push queda como SIMULATED.
 */
@Injectable()
export class WebPusher {
  readonly publicKey = env('VAPID_PUBLIC_KEY', '');
  private readonly configured: boolean;

  constructor(private readonly prisma: PrismaService) {
    const privateKey = env('VAPID_PRIVATE_KEY', '');
    this.configured = Boolean(this.publicKey && privateKey);
    if (this.configured) webpush.setVapidDetails(env('VAPID_SUBJECT', 'mailto:admin@sportsleague.com'), this.publicKey, privateKey);
  }

  get enabled(): boolean {
    return this.configured;
  }

  subscribe(userId: string, subscription: BrowserSubscription, userAgent?: string) {
    const data = { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent: userAgent?.slice(0, 300) ?? null };
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { endpoint: subscription.endpoint, ...data },
      update: data,
      select: { id: true, createdAt: true },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { removed: result.count };
  }

  /** Envía el aviso a todos los navegadores del usuario y borra las suscripciones caducadas (404/410). */
  async sendToUser(userId: string, message: PushMessage): Promise<PushStatus> {
    if (!this.configured) return 'SIMULATED';
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return 'SIMULATED';
    const payload = JSON.stringify({ title: message.title, body: message.body, link: message.link ?? '/panel/notificaciones' });
    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            payload,
            { TTL: 24 * 3600, timeout: 10_000 },
          );
          return true;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
          } else {
            log.warn('push_failed', { statusCode, error: (err as Error).message });
          }
          return false;
        }
      }),
    );
    return results.some(Boolean) ? 'SENT' : 'FAILED';
  }
}
