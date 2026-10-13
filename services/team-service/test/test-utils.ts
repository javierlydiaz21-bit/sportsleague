import { INestApplication, Type } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AllExceptionsFilter, EventBus, InMemoryEventBus, RedisService, createValidationPipe } from '../src/chassis';

export const INTERNAL_TOKEN = 'test-internal-token';
process.env.INTERNAL_API_TOKEN = INTERNAL_TOKEN;
process.env.LOG_LEVEL = 'error';

/** Cliente Redis falso: suficiente para caché, contadores y pipelines en pruebas. */
export function redisStub(): any {
  const store = new Map<string, string>();
  const chain: any = new Proxy({}, { get: (_t, prop) => (prop === 'exec' ? async () => [] : () => chain) });
  const client: any = new Proxy(
    {},
    {
      get: (_t, prop: string | symbol) => {
        switch (prop) {
          case 'get':
            return async (key: string) => store.get(key) ?? null;
          case 'set':
            return async (key: string, value: string) => {
              store.set(key, value);
              return 'OK';
            };
          case 'del':
            return async (...keys: string[]) => {
              keys.forEach((key) => store.delete(key));
              return keys.length;
            };
          case 'incr':
            return async (key: string) => {
              const next = Number(store.get(key) ?? 0) + 1;
              store.set(key, String(next));
              return next;
            };
          case 'multi':
            return () => chain;
          case 'ping':
            return async () => 'PONG';
          case 'on':
            return () => client;
          case 'then':
            return undefined;
          case '_store':
            return store;
          default:
            return async () => null;
        }
      },
    },
  );
  return client;
}

export function redisServiceStub() {
  return { client: redisStub(), create: () => redisStub(), ping: async () => 'PONG', onModuleDestroy: async () => undefined };
}

export async function createTestApp(
  moduleClass: Type<unknown>,
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<{ app: INestApplication; bus: InMemoryEventBus }> {
  const bus = new InMemoryEventBus();
  let builder = Test.createTestingModule({ imports: [moduleClass] })
    .overrideProvider(RedisService)
    .useValue(redisServiceStub())
    .overrideProvider(EventBus)
    .useValue(bus);
  if (configure) builder = configure(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'status', 'metrics'] });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return { app, bus };
}

export const internalOnly = { 'x-internal-token': INTERNAL_TOKEN };

export function asUser(user: { id: string; role: string; email?: string; name?: string }) {
  return {
    'x-internal-token': INTERNAL_TOKEN,
    'x-user-id': user.id,
    'x-user-role': user.role,
    'x-user-email': user.email ?? 'user@test.com',
    'x-user-name': encodeURIComponent(user.name ?? 'Usuario de prueba'),
  };
}
