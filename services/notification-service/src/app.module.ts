import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { Mailer } from './notifications/mailer';
import { NotificationsController, SubscriptionsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [NotificationsController, SubscriptionsController],
  providers: [NotificationsService, Mailer],
})
export class AppModule {}
