import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { UpdateSeasonDto } from './dto';
import { LeaguesService } from './leagues.service';

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly leagues: LeaguesService) {}

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.leagues.getSeason(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSeasonDto, @CurrentUser() user: AuthUser) {
    return this.leagues.updateSeason(id, dto, user);
  }
}
