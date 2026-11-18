import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { RedisService, env, envInt, envList, type OpenApiOptions } from '../chassis';
import { createAuthMiddleware, rejectUnknownOrigins } from './auth.middleware';
import { createProxyDispatcher } from './proxy';
import { createRateLimiter, limitsFromEnv } from './rate-limit.middleware';
import { serviceUrls } from './routes';
import { createWakeMiddleware } from './wake';

/** /docs del gateway: sus rutas propias, con el esquema Bearer para probarlas con un JWT. */
export const GATEWAY_OPENAPI: Pick<OpenApiOptions, 'description' | 'bearer'> = {
  bearer: true,
  description:
    'Punto de entrada único de SportsLeague. Aquí están las rutas propias del gateway; el resto de `/api/v1` ' +
    'se reenvía a cada microservicio, que documenta las suyas en su propio `/docs`. Para probar las rutas de ' +
    'administración, inicia sesión con `POST /api/v1/auth/login` (`"client": "mobile"` devuelve el ' +
    '`accessToken` en el cuerpo), pulsa «Authorize» y pega ese token.',
};

/**
 * Cadena del gateway sobre la aplicación ya configurada con configureApp: cabeceras de seguridad,
 * CORS, autenticación JWT, rate limiting y proxy a los microservicios. La usan main.ts y las pruebas
 * de integración, para que estas prueben exactamente la misma cadena que producción.
 */
export function configureGateway(app: NestExpressApplication): void {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Solo en Render Free (render-free.yaml): despierta a todos los servicios cuando llega tráfico.
  if (env('WAKE_SERVICES', 'false') === 'true') {
    app.use(createWakeMiddleware(Object.values(serviceUrls()), envInt('WAKE_INTERVAL_MS', 4 * 60_000)));
  }

  const origins = envList('CORS_ORIGINS', ['http://localhost:3000']);
  app.use(rejectUnknownOrigins(origins));
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    maxAge: 600,
  });

  const redis = app.get(RedisService);
  app.use(
    createAuthMiddleware({
      secret: env('JWT_SECRET', 'dev-jwt-secret-change-me'),
      internalToken: env('INTERNAL_API_TOKEN', 'dev-internal-token-change-me'),
      isSuspended: async (userId) => !!(await redis.client.get(`auth:suspended:${userId}`).catch(() => null)),
    }),
  );
  app.use(
    createRateLimiter(async (key, ttl) => {
      const result = await redis.client.multi().incr(key).expire(key, ttl).exec();
      return Number(result?.[0]?.[1] ?? 0);
    }, limitsFromEnv()),
  );
  app.use(createProxyDispatcher(serviceUrls()));
}
