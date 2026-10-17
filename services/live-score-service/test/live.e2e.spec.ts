import { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { InMemoryEventBus } from '../src/chassis';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, internalOnly } from './test-utils';

const matchId = '44444444-4444-4444-8444-444444444444';

describe('Live Score Service (HTTP + WebSocket)', () => {
  let app: INestApplication;
  let bus: InMemoryEventBus;
  let socket: Socket;
  const prisma = {
    liveMatch: { findUnique: jest.fn(async () => null) },
  };

  beforeAll(async () => {
    ({ app, bus } = await createTestApp(AppModule, (builder) => builder.overrideProvider(PrismaService).useValue(prisma)));
    await app.listen(0);
  });

  afterAll(async () => {
    socket?.disconnect();
    await app?.close();
  });

  it('el marcador de un partido no iniciado es consultable sin sesión', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/matches/${matchId}/live`).set(internalOnly).expect(200);
    expect(res.body).toMatchObject({ status: 'NOT_STARTED', score: { home: 0, away: 0 } });
  });

  it('registrar eventos requiere sesión', async () => {
    await request(app.getHttpServer()).post(`/api/v1/matches/${matchId}/events`).set(internalOnly).send({}).expect(401);
  });

  it('difunde por WebSocket los eventos publicados en el bus', async () => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    socket = io(`http://127.0.0.1:${port}/live`, { transports: ['websocket'] });

    const snapshot = await new Promise<any>((resolve) => {
      socket.on('match:snapshot', resolve);
      socket.on('connect', () => socket.emit('subscribe', { matchId }));
    });
    expect(snapshot.status).toBe('NOT_STARTED');

    const received = new Promise<any>((resolve) => socket.on('match:event', resolve));
    await bus.publish('match.event', { matchId, type: 'GOAL', score: { home: 1, away: 0 }, registeredAt: new Date().toISOString() });
    await expect(received).resolves.toMatchObject({ matchId, type: 'GOAL', score: { home: 1, away: 0 } });
  });

  it('el canal /live-scores del documento de arquitectura difunde los mismos eventos', async () => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    const alias = io(`http://127.0.0.1:${port}/live-scores`, { transports: ['websocket'] });
    try {
      await new Promise((resolve) => {
        alias.on('match:snapshot', resolve);
        alias.on('connect', () => alias.emit('subscribe', { matchId }));
      });
      const received = new Promise<any>((resolve) => alias.on('match:event', resolve));
      await bus.publish('match.event', { matchId, type: 'YELLOW_CARD', score: { home: 1, away: 0 } });
      await expect(received).resolves.toMatchObject({ matchId, type: 'YELLOW_CARD' });
    } finally {
      alias.disconnect();
    }
  });
});
