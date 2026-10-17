import { useEffect, useEffectEvent, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { withEvent, withoutEvent } from './compose';
import { WS_FALLBACK_NAMESPACE, WS_NAMESPACE, WS_URL } from './config';
import type { LiveSnapshot, MatchEvent, Score } from './types';

/** Sin conexión en vivo, el marcador se consulta por HTTP cada 10 s (GET /matches/:id/live). */
const FALLBACK_POLL_MS = 10_000;

/**
 * Suscripción WebSocket al canal del partido (Live Score Service, namespace /live-scores). Los
 * eventos llegan sin polling: snapshot inicial, cada evento, correcciones y número de espectadores.
 * Es el mismo protocolo que usa la web en frontend/src/lib/live.ts. Mientras el WebSocket no esté
 * conectado (servicio despertando, red móvil inestable, origen rechazado…), fetchSnapshot mantiene
 * el marcador al día por HTTP.
 */
export function useLiveMatch(matchId: string, initial: LiveSnapshot, fetchSnapshot?: () => Promise<LiveSnapshot>) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(initial);
  const [connected, setConnected] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  useEffect(() => {
    let socket: Socket | null = null;
    let disposed = false;

    const open = (namespace: string) => {
      const current = io(`${WS_URL}${namespace}`, { transports: ['websocket'], reconnectionDelayMax: 5000 });
      socket = current;
      current.on('connect', () => {
        setConnected(true);
        current.emit('subscribe', { matchId });
      });
      current.on('disconnect', () => setConnected(false));
      current.on('connect_error', (err: Error) => {
        setConnected(false);
        // Servidor sin el alias /live-scores todavía desplegado: se usa el canal original /live.
        if (namespace === WS_NAMESPACE && /invalid namespace/i.test(err.message) && !disposed) {
          current.removeAllListeners();
          current.disconnect();
          open(WS_FALLBACK_NAMESPACE);
        }
      });
      current.on('match:snapshot', (next: LiveSnapshot) => {
        if (next.matchId === matchId) setSnapshot(next);
      });
      current.on('match:event', (payload: { matchId: string; event?: MatchEvent; score: Score }) => {
        const event = payload.event;
        if (payload.matchId !== matchId || !event) return;
        setSnapshot((prev) => withEvent(prev, event, payload.score));
        setLastEventId(event.id);
      });
      current.on('match:event-deleted', (payload: { matchId: string; eventId: string; score: Score }) => {
        if (payload.matchId !== matchId) return;
        setSnapshot((prev) => withoutEvent(prev, payload.eventId, payload.score));
      });
      current.on('viewers', (payload: { matchId: string; count: number }) => {
        if (payload.matchId === matchId) setSnapshot((prev) => ({ ...prev, viewers: payload.count }));
      });
    };

    open(WS_NAMESPACE);
    return () => {
      disposed = true;
      const current = socket as Socket | null;
      if (current) {
        if (current.connected) current.emit('unsubscribe', { matchId });
        current.removeAllListeners();
        current.disconnect();
      }
    };
  }, [matchId]);

  const poll = useEffectEvent((apply: (next: LiveSnapshot) => void) => {
    fetchSnapshot?.().then(apply).catch(() => undefined);
  });

  useEffect(() => {
    if (connected) return;
    let active = true;
    const id = setInterval(() => {
      poll((next) => {
        if (active && next.matchId === matchId) setSnapshot(next);
      });
    }, FALLBACK_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [connected, matchId]);

  return { snapshot, setSnapshot, connected, lastEventId };
}
