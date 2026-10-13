import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { log } from './logger';
import { httpRequestDuration, httpRequestsTotal } from './metrics';
import { requestContext } from './request-context';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const MATCH_RE = /\/matches\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const QUIET_PATHS = new Set(['/health', '/metrics', '/status']);

export function normalizeRoute(path: string): string {
  return path.replace(UUID_RE, ':id');
}

export function extractMatchId(url: string): string | undefined {
  return MATCH_RE.exec(url)?.[1];
}

export interface ObservabilityOptions {
  /** El gateway no tiene rutas propias para lo que reenvía: usa el path normalizado. */
  routeFromPath?: boolean;
}

/**
 * Middleware de observabilidad: asigna x-request-id, registra métricas HTTP
 * y escribe un log estructurado por solicitud (incluye match_id cuando aplica).
 */
export function httpObservability(options: ObservabilityOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 100 ? incoming : randomUUID();
    const rawUser = req.headers['x-user-id'];
    const userId = typeof rawUser === 'string' ? rawUser : undefined;
    const matchId = extractMatchId(req.originalUrl ?? req.url);
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const matchedRoute = req.route?.path ? `${req.baseUrl ?? ''}${String(req.route.path)}` : undefined;
      const route = matchedRoute
        ? normalizeRoute(matchedRoute)
        : options.routeFromPath
          ? normalizeRoute(req.path)
          : 'unmatched';
      const status = String(res.statusCode);
      httpRequestsTotal.inc({ method: req.method, route, status });
      httpRequestDuration.observe({ method: req.method, route, status }, seconds);
      if (QUIET_PATHS.has(req.path)) return;

      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      log[level]('http_request', {
        method: req.method,
        path: (req.originalUrl ?? req.url).split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(seconds * 1000),
        requestId,
        userId,
        ...(matchId ? { matchId } : {}),
        // Las lecturas (p. ej. espectadores consultando el marcador) no ensucian la traza del partido.
        noTrace: req.method === 'GET' || req.method === 'HEAD',
      });
    });

    requestContext.run({ requestId, userId, matchId }, () => next());
  };
}
