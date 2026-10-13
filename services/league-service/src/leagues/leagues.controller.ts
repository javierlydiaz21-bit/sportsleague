import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Public, Roles, type AuthUser } from '../chassis';
import {
  CreateCategoryDto,
  CreateLeagueDto,
  CreateSeasonDto,
  CreateVenueDto,
  ListLeaguesQuery,
  ReviewLeagueDto,
  UpdateLeagueDto,
} from './dto';
import { LeaguesService } from './leagues.service';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Post()
  @Roles('ORGANIZER', 'ADMIN')
  create(@Body() dto: CreateLeagueDto, @CurrentUser() user: AuthUser) {
    return this.leagues.create(dto, user);
  }

  @Public()
  @Get()
  list(@Query() query: ListLeaguesQuery, @CurrentUser() user?: AuthUser) {
    return this.leagues.list(query, user);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.leagues.mine(user);
  }

  @Get('stats')
  @Roles('ADMIN')
  stats() {
    return this.leagues.stats();
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.leagues.get(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeagueDto, @CurrentUser() user: AuthUser) {
    return this.leagues.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.leagues.remove(id, user);
  }

  @Patch(':id/review')
  @Roles('ADMIN')
  review(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewLeagueDto, @CurrentUser() admin: AuthUser) {
    return this.leagues.review(id, dto, admin);
  }

  @Post(':id/seasons')
  addSeason(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSeasonDto, @CurrentUser() user: AuthUser) {
    return this.leagues.addSeason(id, dto, user);
  }

  @Post(':id/categories')
  addCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.leagues.addCategory(id, dto, user);
  }

  @Post(':id/venues')
  addVenue(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateVenueDto, @CurrentUser() user: AuthUser) {
    return this.leagues.addVenue(id, dto, user);
  }
}
