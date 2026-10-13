import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { SystemController } from './gateway/system.controller';
import { SystemService } from './gateway/system.service';

@Module({
  // El gateway valida los JWT con su propio middleware, por eso no usa el guard de servicio.
  imports: [ChassisModule.forRoot({ authGuard: false })],
  controllers: [SystemController],
  providers: [SystemService],
})
export class AppModule {}
