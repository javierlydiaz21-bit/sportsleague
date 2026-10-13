import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { LeagueClient } from './clients/league.client';
import { PrismaModule } from './prisma/prisma.service';
import { PlayersController } from './teams/players.controller';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [TeamsController, PlayersController],
  providers: [TeamsService, LeagueClient],
})
export class AppModule {}
