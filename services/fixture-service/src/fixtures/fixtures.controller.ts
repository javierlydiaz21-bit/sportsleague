import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Public, Roles, type AuthUser } from '../chassis';
import { CreateMatchDto, FixturesQuery, GenerateFixtureDto, ListMatchesQuery, RescheduleMatchDto, SuspendMatchDto } from './dto';
import { FixturesService } from './fixtures.service';

@Controller()
export class FixturesController {
  constructor(private readonly fixtures: FixturesService) {}

  @Post('seasons/:seasonId/fixtures/generate')
  @Roles('ORGANIZER', 'ADMIN')
  generate(
    @Param('seasonId', ParseUUIDPipe) seasonId: string,
    @Body() dto: GenerateFixtureDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.fixtures.generate(seasonId, dto, user);
  }

  @Public()
  @Get('seasons/:seasonId/fixtures')
  seasonFixtures(
    @Param('seasonId', ParseUUIDPipe) seasonId: string,
    @Query() query: FixturesQuery,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.fixtures.seasonFixtures(seasonId, query.categoryId, user);
  }

  @Public()
  @Get('fixtures/:id')
  getFixture(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.fixtures.getFixture(id, user);
  }

  @Post('fixtures/:id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.fixtures.publish(id, user);
  }

  @Delete('fixtures/:id')
  discard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.fixtures.discard(id, user);
  }

  @Public()
  @Get('matches')
  listMatches(@Query() query: ListMatchesQuery) {
    return this.fixtures.listMatches(query);
  }

  @Post('matches')
  @Roles('ORGANIZER', 'ADMIN')
  createMatch(@Body() dto: CreateMatchDto, @CurrentUser() user: AuthUser) {
    return this.fixtures.createMatch(dto, user);
  }

  @Public()
  @Get('matches/:id')
  getMatch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.fixtures.getMatch(id, user);
  }

  @Put('matches/:id/venue')
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleMatchDto, @CurrentUser() user: AuthUser) {
    return this.fixtures.reschedule(id, dto, user);
  }

  @Patch('matches/:id/status')
  suspend(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SuspendMatchDto, @CurrentUser() user: AuthUser) {
    return this.fixtures.suspend(id, dto, user);
  }
}
