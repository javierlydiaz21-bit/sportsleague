import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from './bootstrap';
import { EventBus } from './event-bus';
import { HealthController, HealthRegistry, isMetricsRequestAllowed } from './health';

/** HealthController real con sus dependencias simuladas (sin Redis ni bus de eventos). */
async function healthApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      { provide: HealthRegistry, useValue: { run: jest.fn(async () => ({ ok: true, checks: {} })) } },
      { provide: EventBus, useValue: { subscribedTypes: jest.fn(() => []) } },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false, bodyParser: false });
  configureApp(app);
  await app.init();
  return app;
}

describe('/metrics con METRICS_TOKEN', () => {
  const original = process.env.METRICS_TOKEN;
  let app: NestExpressApplication | undefined;
  afterEach(async () => {
    if (original === undefined) delete process.env.METRICS_TOKEN;
    else process.env.METRICS_TOKEN = original;
    await app?.close();
    app = undefined;
  });

  it('sin METRICS_TOKEN cualquiera puede leer las métricas; con él, solo con el Bearer correcto', () => {
    expect(isMetricsRequestAllowed(undefined, undefined)).toBe(true);
    expect(isMetricsRequestAllowed(undefined, '')).toBe(true);
    expect(isMetricsRequestAllowed(undefined, 'secreto-de-metricas')).toBe(false);
    expect(isMetricsRequestAllowed('Bearer otro-valor', 'secreto-de-metricas')).toBe(false);
    expect(isMetricsRequestAllowed('Basic secreto-de-metricas', 'secreto-de-metricas')).toBe(false);
    expect(isMetricsRequestAllowed('Bearer secreto-de-metricas', 'secreto-de-metricas')).toBe(true);
  });

  it('sin la variable (local), GET /metrics responde 200 sin cabecera Authorization', async () => {
    delete process.env.METRICS_TOKEN;
    app = await healthApp();
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });

  it('con la variable (producción), GET /metrics exige Authorization: Bearer <METRICS_TOKEN>', async () => {
    process.env.METRICS_TOKEN = 'secreto-de-metricas';
    app = await healthApp();
    const http = () => request(app!.getHttpServer());
    const missing = await http().get('/metrics').expect(401);
    expect(missing.headers['www-authenticate']).toBe('Bearer realm="metrics"');
    await http().get('/metrics').set('Authorization', 'Bearer otro-valor').expect(401);
    const ok = await http().get('/metrics').set('Authorization', 'Bearer secreto-de-metricas').expect(200);
    expect(ok.headers['content-type']).toContain('text/plain');
    // /health sigue abierto: lo usa Render para los rolling updates.
    await http().get('/health').expect(200);
  });
});
