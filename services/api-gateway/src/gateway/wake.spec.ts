import { createWakeMiddleware } from './wake';

process.env.LOG_LEVEL = 'error';

describe('despertador de servicios (Render Free)', () => {
  it('consulta el /health de todos los servicios como mucho una vez por intervalo', () => {
    const ping = jest.fn().mockResolvedValue(undefined);
    let clock = 1_000_000;
    const wake = createWakeMiddleware(['https://auth', 'https://league'], 60_000, ping, () => clock);
    const next = jest.fn();

    wake({} as any, {} as any, next);
    wake({} as any, {} as any, next);
    expect(ping.mock.calls).toEqual([['https://auth/health'], ['https://league/health']]);

    clock += 60_000;
    wake({} as any, {} as any, next);
    expect(ping).toHaveBeenCalledTimes(4);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('no retrasa ni rompe la petición si un servicio no responde', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('dormido'));
    const next = jest.fn();
    createWakeMiddleware(['https://auth'], 60_000, ping)({} as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setImmediate(resolve)); // el rechazo se ignora sin errores
  });
});
