'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from './config';
import type { LiveSnapshot, MatchEvent, Score } from './types';

const byMinute = (a: MatchEvent, b: MatchEvent) => a.minute - b.minute || a.createdAt.localeCompare(b.createdAt);

/**
 * Suscripción WebSocket al canal del partido (Live Score Service). Los eventos
 * llegan sin polling: snapshot inicial, cada evento, correcciones y espectadores.
 */
export function useLiveMatch(matchId: string, initial: LiveSnapshot) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(initial);
  const [connected, setConnected] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(`${WS_URL}/live`, { transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 });
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', { matchId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('match:snapshot', (next: LiveSnapshot) => {
      if (next.matchId === matchId) setSnapshot(next);
    });
    socket.on('match:event', (payload: { matchId: string; event: MatchEvent; score: Score }) => {
      if (payload.matchId !== matchId || !payload.event) return;
      setSnapshot((prev) => ({
        ...prev,
        status: prev.status === 'NOT_STARTED' ? 'LIVE' : prev.status,
        score: payload.score,
        events: prev.events.some((e) => e.id === payload.event.id) ? prev.events : [...prev.events, payload.event].sort(byMinute),
      }));
      setLastEventId(payload.event.id);
    });
    socket.on('match:event-deleted', (payload: { matchId: string; eventId: string; score: Score }) => {
      if (payload.matchId !== matchId) return;
      setSnapshot((prev) => ({ ...prev, score: payload.score, events: prev.events.filter((e) => e.id !== payload.eventId) }));
    });
    socket.on('viewers', (payload: { matchId: string; count: number }) => {
      if (payload.matchId === matchId) setSnapshot((prev) => ({ ...prev, viewers: payload.count }));
    });
    return () => {
      socket.emit('unsubscribe', { matchId });
      socket.disconnect();
    };
  }, [matchId]);

  return { snapshot, setSnapshot, connected, lastEventId };
}
