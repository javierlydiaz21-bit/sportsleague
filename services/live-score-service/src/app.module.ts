import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { UpstreamClients } from './live/clients';
import { LiveController } from './live/live.controller';
import { LiveGateway } from './live/live.gateway';
import { LiveService } from './live/live.service';
import { ViewersService } from './live/viewers.service';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [LiveController],
  providers: [LiveService, LiveGateway, ViewersService, UpstreamClients],
})
export class AppModule {}
