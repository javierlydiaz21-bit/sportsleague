import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthContextGuard } from './auth-context';
import { CacheService } from './cache.service';
import { EventBus, RedisEventBus } from './event-bus';
import { HealthController, HealthRegistry } from './health';
import { RedisService } from './redis.service';
import { TraceService } from './trace.service';

export interface ChassisOptions {
  /** El API Gateway valida JWT por su cuenta, así que desactiva el guard de servicio. */
  authGuard?: boolean;
}

@Global()
@Module({})
export class ChassisModule {
  static forRoot(options: ChassisOptions = {}): DynamicModule {
    const providers: Provider[] = [
      RedisService,
      CacheService,
      TraceService,
      HealthRegistry,
      { provide: EventBus, useClass: RedisEventBus },
    ];
    if (options.authGuard !== false) providers.push({ provide: APP_GUARD, useClass: AuthContextGuard });
    return {
      module: ChassisModule,
      global: true,
      providers,
      controllers: [HealthController],
      exports: [RedisService, CacheService, TraceService, HealthRegistry, EventBus],
    };
  }
}
