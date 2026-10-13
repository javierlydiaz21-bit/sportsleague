import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { PrismaModule } from './prisma/prisma.service';
import { UpstreamClients } from './statistics/clients';
import { StatisticsController } from './statistics/statistics.controller';
import { StatisticsService } from './statistics/statistics.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, UpstreamClients],
})
export class AppModule {}
