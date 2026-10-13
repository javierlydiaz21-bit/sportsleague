import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { StatisticsService } from './statistics.service';

class CategoryQuery {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

class SeasonQuery {
  @IsOptional()
  @IsUUID()
  seasonId?: string;
}

class RecalculateDto {
  @IsUUID()
  seasonId: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  reconcile?: boolean;
}

@Controller()
export class StatisticsController {
  constructor(private readonly stats: StatisticsService) {}

  @Public()
  @Get('standings/:seasonId')
  standings(@Param('seasonId', ParseUUIDPipe) seasonId: string, @Query() query: CategoryQuery) {
    return this.stats.standings(seasonId, query.categoryId);
  }

  @Public()
  @Get('top-scorers/:seasonId')
  topScorers(@Param('seasonId', ParseUUIDPipe) seasonId: string, @Query() query: CategoryQuery) {
    return this.stats.topScorers(seasonId, query.categoryId, query.limit);
  }

  @Public()
  @Get('disciplinary/:seasonId')
  discipline(@Param('seasonId', ParseUUIDPipe) seasonId: string, @Query() query: CategoryQuery) {
    return this.stats.discipline(seasonId, query.categoryId);
  }

  @Public()
  @Get('players/:id/disciplinary-record')
  playerRecord(@Param('id', ParseUUIDPipe) id: string, @Query() query: SeasonQuery) {
    return this.stats.playerRecord(id, query.seasonId);
  }

  @Public()
  @Get('statistics/results/:seasonId')
  results(@Param('seasonId', ParseUUIDPipe) seasonId: string, @Query() query: CategoryQuery) {
    return this.stats.results(seasonId, query.categoryId);
  }

  @Post('statistics/recalculate')
  @HttpCode(200)
  recalculate(@Body() dto: RecalculateDto, @CurrentUser() user: AuthUser) {
    return this.stats.manualRecalculate(dto.seasonId, dto.categoryId, dto.reconcile ?? false, user);
  }
}
