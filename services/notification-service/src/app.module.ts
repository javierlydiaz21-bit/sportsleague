import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { Mailer } from './notifications/mailer';
import { NotificationsController, SubscriptionsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { WebPusher } from './notifications/push';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [NotificationsController, SubscriptionsController],
  providers: [NotificationsService, Mailer, WebPusher],
})
export class AppModule {}
