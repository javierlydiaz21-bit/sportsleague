import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { EVENT_TYPES, type EventTypeName } from './score';

export class AddEventDto {
  @IsIn(EVENT_TYPES)
  type: EventTypeName;

  @IsUUID()
  teamId: string;

  @IsOptional()
  @IsUUID()
  playerId?: string;

  /** Solo para sustituciones: jugador que entra. */
  @IsOptional()
  @IsUUID()
  playerInId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  minute: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  value?: number;
}

export class CompleteMatchDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200000)
  attendance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListLiveQuery {
  @IsOptional()
  @IsString()
  ids?: string;

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
  @IsIn(['LIVE', 'FINISHED', 'SUSPENDED'])
  status?: 'LIVE' | 'FINISHED' | 'SUSPENDED';

  @IsOptional()
  @IsIn(['true', 'false'])
  includeEvents?: 'true' | 'false';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
