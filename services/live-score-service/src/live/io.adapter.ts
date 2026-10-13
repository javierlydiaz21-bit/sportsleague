import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { envList } from '../chassis';

/** Adaptador Socket.IO con CORS restringido a los orígenes permitidos (WS_ALLOWED_ORIGINS). */
export class LiveIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: envList('WS_ALLOWED_ORIGINS', ['http://localhost:3000']), credentials: true },
      pingInterval: 20_000,
      pingTimeout: 20_000,
    });
  }
}
