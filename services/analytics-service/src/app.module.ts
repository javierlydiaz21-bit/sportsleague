import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { AnalyticsController } from './etl/analytics.controller';
import { AnalyticsService } from './etl/analytics.service';
import { EtlService } from './etl/etl.service';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EtlService],
})
export class AppModule {}
