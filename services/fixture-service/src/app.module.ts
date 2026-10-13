import { Module } from '@nestjs/common';
import { ChassisModule } from './chassis';
import { LeagueClient, TeamClient } from './clients/clients';
import { FixturesController } from './fixtures/fixtures.controller';
import { FixturesService } from './fixtures/fixtures.service';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [ChassisModule.forRoot(), PrismaModule],
  controllers: [FixturesController],
  providers: [FixturesService, LeagueClient, TeamClient],
})
export class AppModule {}
