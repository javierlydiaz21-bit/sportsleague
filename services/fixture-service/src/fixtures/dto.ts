import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateFixtureDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  matchDays?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(300)
  slotMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  minRestDays?: number;

  @IsOptional()
  @IsBoolean()
  doubleRound?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  venueIds?: string[];

  @IsOptional()
  @IsBoolean()
  shuffle?: boolean;
}

export class CreateMatchDto {
  @IsUUID()
  seasonId: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  homeTeamId: string;

  @IsUUID()
  awayTeamId: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsISO8601()
  scheduledAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  round?: number;
}

export class RescheduleMatchDto {
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}

export class SuspendMatchDto {
  @IsIn(['SUSPENDED'])
  status: 'SUSPENDED';

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason: string;
}

export class ListMatchesQuery {
  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @IsOptional()
  @IsUUID()
  seasonId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  /** Uno o varios estados separados por comas. */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  ids?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class FixturesQuery {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
