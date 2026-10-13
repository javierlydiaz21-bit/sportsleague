import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Put, Query } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { EligibilityDto, ListPlayersQuery, UpdatePlayerDto } from './dto';
import { TeamsService } from './teams.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly teams: TeamsService) {}

  @Public()
  @Get()
  query(@Query() query: ListPlayersQuery) {
    return this.teams.queryPlayers(query);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.teams.getPlayer(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlayerDto, @CurrentUser() user: AuthUser) {
    return this.teams.updatePlayer(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.teams.removePlayer(id, user);
  }

  @Put(':id/eligibility')
  eligibility(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EligibilityDto, @CurrentUser() user: AuthUser) {
    return this.teams.setEligibility(id, dto, user);
  }
}
