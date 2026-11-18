import { Controller, Get, Module } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from './bootstrap';

@Controller('items')
class ItemsController {
  @Get()
  list(): string[] {
    return [];
  }
}

@Module({ controllers: [ItemsController] })
class DemoModule {}

describe('httpObservability (log por solicitud)', () => {
  let app: NestExpressApplication;
  let lines: string[];
  let write: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DemoModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false, bodyParser: false });
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    lines = [];
    write = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      lines.push(String(chunk));
      return true;
    });
  });

  afterEach(() => write.mockRestore());
  afterAll(async () => app.close());

  const requestLog = () =>
    lines
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.includes('"http_request"'))
      .map((line) => JSON.parse(line) as Record<string, unknown>)[0];

  it('registra la IP del cliente, el método, la ruta, el código, la duración y el x-request-id', async () => {
    // Detrás de un proxy de confianza (TRUST_PROXY), la IP es la del cliente que envía X-Forwarded-For.
    const res = await request(app.getHttpServer()).get('/api/v1/items').set('X-Forwarded-For', '203.0.113.7').expect(200);
    await new Promise((resolve) => setImmediate(resolve));
    expect(requestLog()).toMatchObject({
      msg: 'http_request',
      ip: '203.0.113.7',
      method: 'GET',
      path: '/api/v1/items',
      status: 200,
      requestId: res.headers['x-request-id'],
    });
    expect(typeof requestLog()?.durationMs).toBe('number');
    expect(typeof requestLog()?.ts).toBe('string');
  });
});
