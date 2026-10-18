'use client';

import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { currentSubscription, disablePush, enablePush, pushSupported } from '@/lib/push';
import { Button, Card } from '../ui';

type PushState = 'loading' | 'unsupported' | 'unavailable' | 'denied' | 'enabled' | 'disabled';

const DESCRIPTIONS: Record<Exclude<PushState, 'loading'>, string> = {
  disabled: 'Recibe al instante las jornadas publicadas, asignaciones, cambios de horario y resultados, aunque tengas la web cerrada.',
  enabled: 'Activadas en este navegador: los avisos llegan aunque la web esté cerrada.',
  denied: 'Bloqueaste las notificaciones para este sitio. Permítelas desde el candado de la barra de direcciones y recarga la página.',
  unsupported: 'Este navegador no admite notificaciones push. Prueba con Chrome, Edge o Firefox, en el computador o en Android.',
  unavailable: 'El servidor todavía no tiene activadas las notificaciones push.',
};

/** Activa o desactiva las notificaciones push (Web Push) de este navegador. */
export function PushToggle() {
  const { api } = useAuth();
  const [state, setState] = useState<PushState>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!pushSupported()) return setState('unsupported');
      const { publicKey: key } = await api.get<{ publicKey: string | null }>('/notifications/push/public-key').catch(() => ({ publicKey: null }));
      if (!active) return;
      setPublicKey(key);
      if (!key) return setState('unavailable');
      if (Notification.permission === 'denied') return setState('denied');
      const subscription = await currentSubscription().catch(() => null);
      if (active) setState(subscription ? 'enabled' : 'disabled');
    })();
    return () => {
      active = false;
    };
  }, [api]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage((err as Error).message);
      if (pushSupported() && Notification.permission === 'denied') setState('denied');
    } finally {
      setBusy(false);
    }
  };

  const enable = () =>
    run(async () => {
      await enablePush(api, publicKey as string);
      setState('enabled');
    });
  const disable = () =>
    run(async () => {
      await disablePush(api);
      setState('disabled');
    });
  const sendTest = () =>
    run(async () => {
      const result = await api.post<{ pushStatus?: string }>('/notifications/test');
      setMessage(
        result.pushStatus === 'SENT'
          ? 'Prueba enviada: en unos segundos verás la notificación.'
          : 'No se pudo entregar el push a este navegador. Desactívalas y vuelve a activarlas.',
      );
    });

  if (state === 'loading') return null;
  return (
    <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <BellRing className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Notificaciones en este navegador</p>
        <p className="mt-0.5 text-sm text-muted">{DESCRIPTIONS[state]}</p>
        {message ? (
          <p className="mt-1 text-sm text-fg" role="status">
            {message}
          </p>
        ) : null}
      </div>
      {state === 'disabled' ? (
        <Button variant="brand" size="sm" loading={busy} onClick={enable}>
          Activar
        </Button>
      ) : null}
      {state === 'enabled' ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={sendTest}>
            Enviar prueba
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={disable}>
            Desactivar
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
