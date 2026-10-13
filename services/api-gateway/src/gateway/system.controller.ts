import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { SystemService } from './system.service';

class LimitQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/** Endpoints propios del gateway para el panel de administración (solo ADMIN, ver auth.middleware). */
@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get('health')
  health() {
    return this.system.health();
  }

  @Get('events')
  events(@Query() query: LimitQuery) {
    return this.system.recentEvents(query.limit);
  }

  @Get('traces')
  traces(@Query() query: LimitQuery) {
    return this.system.tracedMatches(query.limit);
  }

  @Get('traces/:matchId')
  trace(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.system.trace(matchId);
  }
}
