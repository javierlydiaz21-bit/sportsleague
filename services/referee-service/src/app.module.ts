import { Module } from '@nestjs/common';
import { AssignmentsController, InternalController, RefereesController } from './assignments/referees.controller';
import { RefereesService } from './assignments/referees.service';
import { ChassisModule } from './chassis';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [RefereesController, AssignmentsController, InternalController],
  providers: [RefereesService],
})
export class AppModule {}
