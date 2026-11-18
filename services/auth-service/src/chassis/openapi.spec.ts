import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { configureApp } from './bootstrap';
import { resourceTag, setupOpenApi } from './openapi';

class CreateItemDto {
  @IsString()
  name!: string;
}

@Controller('items')
class ItemsController {
  @Get()
  list(): string[] {
    return [];
  }

  @Post()
  create(@Body() dto: CreateItemDto): CreateItemDto {
    return dto;
  }
}

@Controller()
class HealthController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({ controllers: [ItemsController, HealthController] })
class DemoModule {}

/** App mínima montada como bootstrapService: configureApp y luego setupOpenApi. */
async function demoApp(bearer?: boolean): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [DemoModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false, bodyParser: false });
  configureApp(app);
  setupOpenApi(app, { name: 'demo', version: '9.9.9', bearer });
  await app.init();
  return app;
}

describe('setupOpenApi (/docs y /openapi.json)', () => {
  let app: NestExpressApplication | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('agrupa cada ruta por su recurso; /health, /status y /metrics van en «operación»', () => {
    expect(resourceTag('/api/v1/leagues/{id}/seasons')).toBe('leagues');
    expect(resourceTag('/api/v1/system/health')).toBe('system');
    expect(resourceTag('/health')).toBe('operación');
    expect(resourceTag('/api/v1')).toBe('operación');
  });

  it('GET /openapi.json documenta las rutas con el prefijo /api/v1, agrupadas, sin esquema de seguridad', async () => {
    app = await demoApp();
    const res = await request(app.getHttpServer()).get('/openapi.json').expect(200);
    expect(res.body.info).toMatchObject({ title: 'SportsLeague · demo', version: '9.9.9' });
    expect(Object.keys(res.body.paths).sort()).toEqual(['/api/v1/items', '/health']);
    expect(res.body.paths['/api/v1/items'].get.tags).toEqual(['items']);
    expect(res.body.paths['/api/v1/items'].post.tags).toEqual(['items']);
    expect(res.body.paths['/health'].get.tags).toEqual(['operación']);
    expect(res.body.components.securitySchemes).toBeUndefined();
  });

  it('GET /docs sirve Swagger UI; en un microservicio, sin «Try it out»', async () => {
    app = await demoApp();
    const page = await request(app.getHttpServer()).get('/docs').expect(200);
    expect(page.text).toContain('swagger-ui');
    const init = await request(app.getHttpServer()).get('/docs/swagger-ui-init.js').expect(200);
    expect(init.text).toMatch(/"supportedSubmitMethods":\s*\[\]/);
  });

  it('con bearer declara el esquema JWT y lo exige en todo salvo en /health', async () => {
    app = await demoApp(true);
    const res = await request(app.getHttpServer()).get('/openapi.json').expect(200);
    expect(res.body.components.securitySchemes.bearer).toMatchObject({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
    expect(res.body.paths['/api/v1/items'].get.security).toEqual([{ bearer: [] }]);
    expect(res.body.paths['/api/v1/items'].post.security).toEqual([{ bearer: [] }]);
    expect(res.body.paths['/health'].get.security).toBeUndefined();
    const init = await request(app.getHttpServer()).get('/docs/swagger-ui-init.js').expect(200);
    expect(init.text).toMatch(/"persistAuthorization":\s*true/);
    expect(init.text).not.toMatch(/"supportedSubmitMethods"/);
  });
});
