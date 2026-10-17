import { IoAdapter } from '@nestjs/platform-socket.io';
import type { IncomingMessage } from 'node:http';
import type { ServerOptions } from 'socket.io';
import { envList } from '../chassis';

/** React Native (Android/iOS) envía como Origin la dirección del propio servidor WebSocket. */
function isSameHost(origin: string, host: string | undefined): boolean {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Adaptador Socket.IO restringido a los orígenes permitidos (WS_ALLOWED_ORIGINS). El CORS solo cubre
 * el sondeo HTTP; allowRequest rechaza también el WebSocket abierto desde otras webs. Se aceptan las
 * conexiones sin Origin (clientes de servidor, k6) y las de la app móvil (Origin = este mismo host).
 */
export class LiveIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const origins = envList('WS_ALLOWED_ORIGINS', ['http://localhost:3000']);
    return super.createIOServer(port, {
      ...options,
      cors: { origin: origins, credentials: true },
      allowRequest: (req: IncomingMessage, callback: (err: string | null | undefined, success: boolean) => void) => {
        const origin = req.headers.origin;
        callback(null, !origin || origins.includes(origin) || isSameHost(origin, req.headers.host));
      },
      pingInterval: 20_000,
      pingTimeout: 20_000,
    });
  }
}
