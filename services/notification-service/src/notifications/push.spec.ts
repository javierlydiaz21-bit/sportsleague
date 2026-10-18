import * as webpush from 'web-push';
import { WebPusher } from './push';

jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));
process.env.LOG_LEVEL = 'error';

const sendNotification = webpush.sendNotification as jest.Mock;
const subscription = { id: 's1', userId: 'u1', endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'p', auth: 'a' };

function setup(subscriptions = [subscription]) {
  const prisma: any = {
    pushSubscription: {
      findMany: jest.fn(async () => subscriptions),
      delete: jest.fn(async () => undefined),
      upsert: jest.fn(async (args: any) => args),
      deleteMany: jest.fn(async () => ({ count: 1 })),
    },
  };
  return { prisma, pusher: new WebPusher(prisma) };
}

describe('WebPusher (Web Push con claves VAPID)', () => {
  beforeEach(() => {
    sendNotification.mockReset();
    process.env.VAPID_PUBLIC_KEY = 'clave-publica';
    process.env.VAPID_PRIVATE_KEY = 'clave-privada';
  });

  afterAll(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it('envía el aviso cifrado a cada navegador del usuario', async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 });
    const { pusher } = setup();
    await expect(pusher.sendToUser('u1', { title: 'Final', body: '2 - 1', link: '/partidos/M1' })).resolves.toBe('SENT');
    const [target, payload] = sendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: subscription.endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(JSON.parse(payload)).toEqual({ title: 'Final', body: '2 - 1', link: '/partidos/M1' });
  });

  it('borra la suscripción caducada (410) y marca FAILED si ningún navegador la recibió', async () => {
    sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));
    const { pusher, prisma } = setup();
    await expect(pusher.sendToUser('u1', { title: 't', body: 'b' })).resolves.toBe('FAILED');
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('queda SIMULATED sin claves VAPID o sin navegadores suscritos', async () => {
    await expect(setup([]).pusher.sendToUser('u1', { title: 't', body: 'b' })).resolves.toBe('SIMULATED');
    delete process.env.VAPID_PRIVATE_KEY;
    const { pusher } = setup();
    expect(pusher.enabled).toBe(false);
    await expect(pusher.sendToUser('u1', { title: 't', body: 'b' })).resolves.toBe('SIMULATED');
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('guarda la suscripción del navegador a nombre del usuario (upsert por endpoint)', async () => {
    const { pusher, prisma } = setup();
    await pusher.subscribe('u1', { endpoint: subscription.endpoint, keys: { p256dh: 'p', auth: 'a' } }, 'Edge');
    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { endpoint: subscription.endpoint }, update: expect.objectContaining({ userId: 'u1', userAgent: 'Edge' }) }),
    );
  });
});
