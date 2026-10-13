import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser, Public, Roles, type AuthUser } from '../chassis';
import { AnalyticsService } from './analytics.service';
import { EtlService } from './etl.service';

class LeagueQuery {
  @IsUUID()
  leagueId: string;
}

class SeasonQuery {
  @IsOptional()
  @IsUUID()
  seasonId?: string;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly etl: EtlService,
  ) {}

  /** KPIs globales de la plataforma para el panel del administrador. */
  @Get('overview')
  @Roles('ADMIN')
  overview() {
    return this.analytics.overview();
  }

  @Get('leagues/:leagueId')
  league(@Param('leagueId', ParseUUIDPipe) leagueId: string, @CurrentUser() user: AuthUser) {
    return this.analytics.league(leagueId, user);
  }

  @Get('attendance')
  attendance(@Query() query: LeagueQuery, @CurrentUser() user: AuthUser) {
    return this.analytics.attendance(query.leagueId, user);
  }

  @Get('suspended-matches')
  suspended(@Query() query: LeagueQuery, @CurrentUser() user: AuthUser) {
    return this.analytics.suspended(query.leagueId, user);
  }

  @Public()
  @Get('team-trend/:teamId')
  trend(@Param('teamId', ParseUUIDPipe) teamId: string, @Query() query: SeasonQuery) {
    return this.analytics.trend(teamId, query.seasonId);
  }

  @Post('etl/run')
  @Roles('ADMIN')
  @HttpCode(200)
  run() {
    return this.etl.run('manual');
  }

  @Get('etl/runs')
  @Roles('ADMIN')
  runs() {
    return this.analytics.runs();
  }
}
