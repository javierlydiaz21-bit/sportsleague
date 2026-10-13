import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { UpdateVenueDto } from './dto';
import { LeaguesService } from './leagues.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.getVenue(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVenueDto, @CurrentUser() user: AuthUser) {
    return this.leagues.updateVenue(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.leagues.removeVenue(id, user);
  }
}
