import type { Api } from './auth';

/**
 * Notificaciones push del navegador (Web Push): el service worker /sw.js recibe los avisos del
 * Notification Service aunque la web esté cerrada. La clave pública VAPID la entrega el propio servicio.
 */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Clave VAPID (base64url) → bytes, como la pide PushManager.subscribe(). */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((value, i) => value === key[i]);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function enablePush(api: Api, publicKey: string): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Bloqueaste las notificaciones para este sitio. Permítelas desde el candado de la barra de direcciones y vuelve a intentarlo.'
        : 'No se activaron: acepta el permiso de notificaciones que muestra el navegador.',
    );
  }
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const key = keyBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription, key)) {
    await subscription.unsubscribe(); // el servidor cambió sus claves VAPID
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const { endpoint, keys } = subscription.toJSON();
  await api.post('/notifications/push/subscriptions', { endpoint, keys: { p256dh: keys?.p256dh, auth: keys?.auth } });
}

export async function disablePush(api: Api): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.del(`/notifications/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`).catch(() => undefined);
  await subscription.unsubscribe();
}
