import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Public, Roles, type AuthUser } from '../chassis';
import { BulkPlayersDto, CreatePlayerDto, CreateTeamDto, ListTeamsQuery, UpdateTeamDto } from './dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @Roles('ORGANIZER', 'ADMIN')
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: AuthUser) {
    return this.teams.create(dto, user);
  }

  @Public()
  @Get()
  list(@Query() query: ListTeamsQuery) {
    return this.teams.list(query);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.teams.get(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto, @CurrentUser() user: AuthUser) {
    return this.teams.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.teams.remove(id, user);
  }

  @Post(':id/players')
  addPlayer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePlayerDto, @CurrentUser() user: AuthUser) {
    return this.teams.addPlayer(id, dto, user);
  }

  @Post(':id/players/bulk')
  addPlayers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BulkPlayersDto, @CurrentUser() user: AuthUser) {
    return this.teams.addPlayersBulk(id, dto, user);
  }

  @Public()
  @Get(':id/players')
  players(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.teams.listPlayers(id, user);
  }
}
