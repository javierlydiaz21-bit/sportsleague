import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export interface OpenApiOptions {
  /** Nombre del servicio (título del documento). */
  name: string;
  version: string;
  /** Texto que encabeza /docs. Por defecto, cómo se usan las rutas de un microservicio. */
  description?: string;
  /**
   * Declara el esquema de seguridad Bearer (JWT) y permite probar las rutas desde /docs.
   * Solo el gateway lo activa: los microservicios exigen además el token interno del gateway.
   */
  bearer?: boolean;
}

/** Rutas abiertas en todos los servicios: no llevan el candado de Bearer. */
const PUBLIC_PATHS = new Set(['/health', '/metrics']);

/** Grupo para /health, /status y /metrics, que no llevan el prefijo /api/v1. */
const OPERATION_TAG = 'operación';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

const SERVICE_DESCRIPTION =
  'Rutas de este microservicio. En producción se usan a través del API Gateway, con el mismo camino ' +
  '(`/api/v1/...`) y `Authorization: Bearer <token>`. El microservicio exige además el token interno que ' +
  'añade el gateway, así que desde esta página no se pueden probar.';

/** Agrupa cada operación por el recurso de su ruta: /api/v1/leagues/{id} → «leagues». */
export function resourceTag(path: string): string {
  return /^\/api\/v1\/([^/]+)/.exec(path)?.[1] ?? OPERATION_TAG;
}

/** Documento OpenAPI de la app: rutas agrupadas por recurso y, si se pide, el esquema Bearer. */
export function createOpenApiDocument(app: INestApplication, options: OpenApiOptions): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle(`SportsLeague · ${options.name}`)
    .setDescription(options.description ?? SERVICE_DESCRIPTION)
    .setVersion(options.version);
  if (options.bearer) {
    builder.addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'accessToken de POST /api/v1/auth/login' }, 'bearer');
  }
  // Sin las etiquetas automáticas por nombre de controlador: se agrupa por recurso (como la tabla del gateway).
  const document = SwaggerModule.createDocument(app, builder.build(), { autoTagControllers: false });

  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation) continue;
      if (!operation.tags?.length) operation.tags = [resourceTag(path)];
      if (options.bearer && !PUBLIC_PATHS.has(path)) operation.security = [{ bearer: [] }];
    }
  }
  return document;
}

/** Documentación de la API: GET /docs (Swagger UI) y GET /openapi.json, sin el prefijo /api/v1. */
export function setupOpenApi(app: INestApplication, options: OpenApiOptions): OpenAPIObject {
  const document = createOpenApiDocument(app, options);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
    raw: ['json'],
    customSiteTitle: `SportsLeague · ${options.name} · API`,
    swaggerOptions: options.bearer ? { persistAuthorization: true } : { supportedSubmitMethods: [] },
  });
  return document;
}
