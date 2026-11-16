import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureService, envInt, serviceInfo } from './config';
import { AllExceptionsFilter } from './errors';
import { httpObservability } from './http-observability';
import { JsonLogger, log } from './logger';
import { initMetrics } from './metrics';
import { createValidationPipe } from './validation';

export interface BootstrapOptions {
  name: string;
  defaultPort: number;
  /** El gateway necesita el cuerpo sin parsear para reenviarlo tal cual. */
  bodyParser?: boolean;
  routeFromPath?: boolean;
  configure?: (app: NestExpressApplication) => void | Promise<void>;
}

export type AppSetupOptions = Pick<BootstrapOptions, 'bodyParser' | 'routeFromPath'>;

/**
 * Middleware de métricas y logs, cuerpo JSON, prefijo /api/v1, validación y filtro de errores.
 * Lo usan el arranque y las pruebas de integración, para que estas pasen por lo mismo que producción.
 * La app debe crearse con { bodyParser: false }.
 */
export function configureApp(app: NestExpressApplication, options: AppSetupOptions = {}): void {
  app.disable('x-powered-by');
  // Los servicios solo reciben tráfico desde la red privada (gateway): se confía en su X-Forwarded-For.
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback, linklocal, uniquelocal');
  app.use(httpObservability({ routeFromPath: options.routeFromPath }));
  if (options.bodyParser !== false) {
    app.useBodyParser('json', { limit: '1mb' });
  }
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'status', 'metrics'] });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
}

/** Arranque estándar de todos los microservicios (mismo comportamiento, código independiente). */
export async function bootstrapService(rootModule: any, options: BootstrapOptions): Promise<NestExpressApplication> {
  configureService(options.name);
  initMetrics(serviceInfo.name);

  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    logger: new JsonLogger(),
    bodyParser: false,
  });
  configureApp(app, options);
  app.enableShutdownHooks();

  await options.configure?.(app);

  const port = envInt('PORT', options.defaultPort);
  await app.listen(port, '0.0.0.0');
  log.info('service_started', { port, version: serviceInfo.version });
  return app;
}
