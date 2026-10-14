import 'reflect-metadata';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisService, bootstrapService, env, envInt, envList } from './chassis';
import { createAuthMiddleware, rejectUnknownOrigins } from './gateway/auth.middleware';
import { createProxyDispatcher } from './gateway/proxy';
import { createRateLimiter, limitsFromEnv } from './gateway/rate-limit.middleware';
import { serviceUrls } from './gateway/routes';
import { createWakeMiddleware } from './gateway/wake';

void bootstrapService(AppModule, {
  name: 'api-gateway',
  defaultPort: 4000,
  // El cuerpo se reenvía sin parsear a cada microservicio.
  bodyParser: false,
  routeFromPath: true,
  configure: (app) => {
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
  },
});
