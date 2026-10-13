import { createRateLimiter } from './rate-limit.middleware';

process.env.LOG_LEVEL = 'error';

function call(middleware: ReturnType<typeof createRateLimiter>, method = 'GET', path = '/api/v1/leagues') {
  const headers: Record<string, string> = {};
  let status = 200;
  let nextCalled = false;
  const res: any = {
    setHeader: (k: string, v: string) => (headers[k] = v),
    status: (code: number) => {
      status = code;
      return res;
    },
    json: () => res,
  };
  return middleware({ method, path, ip: '10.0.0.1' } as any, res, () => (nextCalled = true)).then(() => ({ status, headers, nextCalled }));
}

describe('rate limiting del gateway', () => {
  const limits = { auth: 2, write: 3, read: 5, windowSeconds: 60 };

  it('rechaza con 429 al superar el límite de la ventana', async () => {
    const counts = new Map<string, number>();
    const counter = async (key: string) => {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key)!;
    };
    const middleware = createRateLimiter(counter, limits, () => 1_000_000);
    expect((await call(middleware, 'POST', '/api/v1/auth/login')).nextCalled).toBe(true);
    expect((await call(middleware, 'POST', '/api/v1/auth/login')).nextCalled).toBe(true);
    const third = await call(middleware, 'POST', '/api/v1/auth/login');
    expect(third.status).toBe(429);
    expect(third.headers['Retry-After']).toBeDefined();
    // Las lecturas tienen su propio presupuesto.
    expect((await call(middleware, 'GET')).headers['X-RateLimit-Remaining']).toBe('4');
  });

  it('deja pasar las solicitudes si Redis no está disponible', async () => {
    const middleware = createRateLimiter(async () => {
      throw new Error('redis caído');
    }, limits);
    expect((await call(middleware)).nextCalled).toBe(true);
  });
});
