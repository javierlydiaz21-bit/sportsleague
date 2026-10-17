import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from 'socket.io';
import { io } from 'socket.io-client';
import { LiveIoAdapter } from './io.adapter';

describe('LiveIoAdapter (WS_ALLOWED_ORIGINS)', () => {
  const httpServer = createServer();
  let server: Server;

  beforeAll(async () => {
    process.env.WS_ALLOWED_ORIGINS = 'https://web.example';
    server = new LiveIoAdapter(httpServer).createIOServer(0);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  });

  afterAll(async () => {
    delete process.env.WS_ALLOWED_ORIGINS;
    await new Promise((resolve) => server.close(resolve));
  });

  const connects = (origin?: string) =>
    new Promise<boolean>((resolve) => {
      const { port } = httpServer.address() as AddressInfo;
      const socket = io(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        reconnection: false,
        ...(origin ? { extraHeaders: { origin } } : {}),
      });
      socket.on('connect', () => (socket.disconnect(), resolve(true)));
      socket.on('connect_error', () => (socket.disconnect(), resolve(false)));
    });

  it('acepta el origen de la web, los clientes sin Origin y la app móvil (Origin = el propio host)', async () => {
    const { port } = httpServer.address() as AddressInfo;
    await expect(connects('https://web.example')).resolves.toBe(true);
    await expect(connects()).resolves.toBe(true);
    await expect(connects(`http://127.0.0.1:${port}`)).resolves.toBe(true);
  });

  it('rechaza el WebSocket desde cualquier otro origen', async () => {
    await expect(connects('https://otro-sitio.example')).resolves.toBe(false);
  });
});
