import type { NextFunction, Request, Response } from 'express';
import type { ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import { Counter, Histogram } from 'prom-client';
import { envInt, log, registry } from '../chassis';
import { resolveService, type ServiceName } from './routes';

const gatewayRequests = new Counter({
  name: 'gateway_requests_total',
  help: 'Solicitudes reenviadas por el gateway a cada microservicio',
  labelNames: ['service', 'method', 'status'] as const,
  registers: [registry],
});
const gatewayDuration = new Histogram({
  name: 'gateway_request_duration_seconds',
  help: 'Tiempo de respuesta visto por el gateway, por microservicio',
  labelNames: ['service'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

function isServerResponse(res: ServerResponse | Socket): res is ServerResponse {
  return typeof (res as ServerResponse).writeHead === 'function';
}

/** Un proxy por microservicio; el despachador elige el destino según el path. */
export function createProxyDispatcher(urls: Record<ServiceName, string>) {
  const proxies = new Map<ServiceName, RequestHandler<Request, Response>>();
  // En Render Free conviene esperar más: un servicio dormido tarda ~1 minuto en despertar.
  const timeout = envInt('PROXY_TIMEOUT_MS', 15_000);
  for (const [service, target] of Object.entries(urls) as [ServiceName, string][]) {
    proxies.set(
      service,
      createProxyMiddleware<Request, Response>({
        target,
        changeOrigin: true,
        xfwd: true,
        proxyTimeout: timeout,
        timeout,
        on: {
          error: (err, _req, res) => {
            log.error('proxy_error', { service, error: err.message });
            if (isServerResponse(res) && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({ statusCode: 503, message: `El servicio ${service} no está disponible en este momento`, service }),
              );
            }
          },
        },
      }),
    );
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const service = resolveService(req.path);
    if (!service) return next();
    const stopTimer = gatewayDuration.startTimer({ service });
    res.on('finish', () => {
      stopTimer();
      gatewayRequests.inc({ service, method: req.method, status: String(res.statusCode) });
    });
    return proxies.get(service)!(req, res, next);
  };
}
