import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { CategoriesController } from './leagues/categories.controller';
import { InternalController } from './leagues/internal.controller';
import { LeaguesController } from './leagues/leagues.controller';
import { LeaguesService } from './leagues/leagues.service';
import { SeasonsController } from './leagues/seasons.controller';
import { VenuesController } from './leagues/venues.controller';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [LeaguesController, SeasonsController, CategoriesController, VenuesController, InternalController],
  providers: [LeaguesService],
})
export class AppModule {}
