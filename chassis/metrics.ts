import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/** Registro de métricas Prometheus del servicio (expuesto en GET /metrics). */
export const registry = new Registry();

let defaultMetricsEnabled = false;

export function initMetrics(service: string): void {
  registry.setDefaultLabels({ service });
  if (!defaultMetricsEnabled) {
    collectDefaultMetrics({ register: registry });
    defaultMetricsEnabled = true;
  }
}

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Solicitudes HTTP atendidas',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Tiempo de respuesta de las solicitudes HTTP',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const eventsPublishedTotal = new Counter({
  name: 'events_published_total',
  help: 'Eventos de dominio publicados en el bus',
  labelNames: ['type'] as const,
  registers: [registry],
});

export const eventsConsumedTotal = new Counter({
  name: 'events_consumed_total',
  help: 'Eventos de dominio consumidos',
  labelNames: ['type', 'outcome'] as const,
  registers: [registry],
});

export const upstreamRequestsTotal = new Counter({
  name: 'upstream_requests_total',
  help: 'Llamadas REST síncronas hacia otros microservicios',
  labelNames: ['target', 'outcome'] as const,
  registers: [registry],
});

export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Estado del circuit breaker (0 = cerrado, 1 = semiabierto, 2 = abierto)',
  labelNames: ['target'] as const,
  registers: [registry],
});
