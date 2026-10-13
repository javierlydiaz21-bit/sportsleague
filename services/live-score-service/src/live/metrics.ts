import { Counter, Gauge, Histogram } from 'prom-client';
import { registry } from '../chassis';

/** Eventos de partido registrados (Grafana muestra la tasa por minuto, por liga/temporada/categoría). */
export const matchEventsRegistered = new Counter({
  name: 'match_events_registered_total',
  help: 'Eventos de partido registrados en vivo (goles, tarjetas, sustituciones)',
  labelNames: ['type', 'league_id', 'season_id', 'category_id'] as const,
  registers: [registry],
});

/** Latencia desde que el árbitro registra el evento hasta que se difunde por WebSocket. */
export const liveUpdateLatency = new Histogram({
  name: 'live_score_update_latency_seconds',
  help: 'Latencia de actualización del marcador en vivo',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const wsConnections = new Gauge({
  name: 'live_ws_connections',
  help: 'Conexiones WebSocket abiertas en esta instancia',
  registers: [registry],
});

export const liveSubscriptions = new Gauge({
  name: 'live_viewers_total',
  help: 'Espectadores suscritos a partidos en esta instancia',
  registers: [registry],
});
