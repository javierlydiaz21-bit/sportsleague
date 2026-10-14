import type { NextFunction, Request, Response } from 'express';
import { log } from '../chassis';

type Ping = (url: string) => Promise<unknown>;

const defaultPing: Ping = (url) => fetch(url, { signal: AbortSignal.timeout(90_000) });

/**
 * Despertador para el plan gratuito de Render, donde cada servicio se duerme tras 15 minutos sin
 * tráfico y tarda ~1 minuto en despertar. Cuando llega una petición al gateway (como mucho una vez
 * cada `intervalMs`) consulta en segundo plano el /health de todos los servicios: así se despiertan
 * a la vez y siguen despiertos mientras alguien use la plataforma. Sin uso, se vuelven a dormir.
 */
export function createWakeMiddleware(urls: string[], intervalMs: number, ping: Ping = defaultPing, now: () => number = Date.now) {
  let last = Number.NEGATIVE_INFINITY;
  return (_req: Request, _res: Response, next: NextFunction) => {
    if (now() - last >= intervalMs) {
      last = now();
      log.debug('services_wake', { services: urls.length });
      for (const url of urls) void ping(`${url}/health`).catch(() => undefined);
    }
    next();
  };
}
