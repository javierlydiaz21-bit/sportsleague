import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TIEBREAKERS, type Tiebreaker } from './rules';

export const SPORTS = ['FOOTBALL', 'BASKETBALL', 'VOLLEYBALL'] as const;
export const LEAGUE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'La hora debe tener el formato HH:MM (24 horas)';

export class CreateLeagueDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name: string;

  @IsIn(SPORTS)
  sport: (typeof SPORTS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class UpdateLeagueDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class ListLeaguesQuery {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(SPORTS)
  sport?: (typeof SPORTS)[number];

  @IsOptional()
  @IsIn(LEAGUE_STATUSES)
  status?: (typeof LEAGUE_STATUSES)[number];

  /** Lista de ids separada por comas (composición de datos desde el frontend). */
  @IsOptional()
  @IsString()
  ids?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReviewLeagueDto {
  @IsIn(['APPROVED', 'REJECTED', 'SUSPENDED'])
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class CreateSeasonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateSeasonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RulesDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  pointsWin: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  pointsDraw: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  pointsLoss: number;

  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(TIEBREAKERS, { each: true })
  tiebreakerCriteria: Tiebreaker[];
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  maxAge?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RulesDto)
  rules?: RulesDto;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  maxAge?: number;
}

export class CreateVenueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  zone: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  availableDays: number[];

  @Matches(TIME, { message: TIME_MESSAGE })
  openTime: string;

  @Matches(TIME, { message: TIME_MESSAGE })
  closeTime: string;
}

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  zone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  availableDays?: number[];

  @IsOptional()
  @Matches(TIME, { message: TIME_MESSAGE })
  openTime?: string;

  @IsOptional()
  @Matches(TIME, { message: TIME_MESSAGE })
  closeTime?: string;
}
