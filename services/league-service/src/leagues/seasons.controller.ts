import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { CreateCategoryDto, UpdateSeasonDto } from './dto';
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

  /** Ruta del documento de arquitectura: la categoría se crea en la liga de la temporada. */
  @Post(':id/categories')
  addCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.leagues.addCategoryToSeason(id, dto, user);
  }
}
