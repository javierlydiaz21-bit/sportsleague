import type { NextFunction, Response } from 'express';
import { Counter } from 'prom-client';
import { envInt, log, registry } from '../chassis';
import type { GatewayRequest } from './auth.middleware';
import { rateTier, type RateTier } from './routes';

const rejections = new Counter({
  name: 'gateway_rate_limit_rejections_total',
  help: 'Solicitudes rechazadas por rate limiting',
  labelNames: ['tier'] as const,
  registers: [registry],
});

export type RateLimits = Record<RateTier, number> & { windowSeconds: number };

export function limitsFromEnv(): RateLimits {
  return {
    auth: envInt('RATE_LIMIT_AUTH', 20),
    write: envInt('RATE_LIMIT_WRITE', 120),
    read: envInt('RATE_LIMIT_READ', 600),
    windowSeconds: envInt('RATE_LIMIT_WINDOW_SECONDS', 60),
  };
}

/** Contador atómico en Redis: incrementa y devuelve el número de solicitudes de la ventana. */
export type WindowCounter = (key: string, ttlSeconds: number) => Promise<number>;

/**
 * Rate limiting por ventana fija, compartido entre réplicas del gateway (Redis).
 * Límite más estricto para el inicio de sesión y las escrituras (p. ej. registrar
 * eventos en vivo) que para las lecturas públicas (marcador, tabla de posiciones).
 * Si Redis no responde, se deja pasar la solicitud (se prioriza la disponibilidad).
 */
export function createRateLimiter(count: WindowCounter, limits: RateLimits, now: () => number = () => Date.now()) {
  return async (req: GatewayRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.method === 'OPTIONS' || !req.path.startsWith('/api/')) return next();
    const tier = rateTier(req.method, req.path);
    const limit = limits[tier];
    const subject = tier !== 'auth' && req.user ? `u:${req.user.id}` : `ip:${req.ip}`;
    const nowSeconds = Math.floor(now() / 1000);
    const window = Math.floor(nowSeconds / limits.windowSeconds);
    let used: number;
    try {
      used = await count(`rl:${tier}:${subject}:${window}`, limits.windowSeconds + 5);
    } catch (err) {
      log.warn('rate_limit_unavailable', { error: (err as Error).message });
      return next();
    }
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - used)));
    if (used > limit) {
      const retryAfter = limits.windowSeconds - (nowSeconds % limits.windowSeconds);
      res.setHeader('Retry-After', String(retryAfter));
      rejections.inc({ tier });
      res.status(429).json({ statusCode: 429, message: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter} s.` });
      return;
    }
    next();
  };
}
