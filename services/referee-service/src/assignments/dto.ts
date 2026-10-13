import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'La hora debe tener el formato HH:MM (24 horas)';

export class AvailabilityDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(TIME, { message: TIME_MESSAGE })
  startTime: string;

  @Matches(TIME, { message: TIME_MESSAGE })
  endTime: string;
}

export class CreateRefereeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  zone: string;

  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  categoriesCertified?: string[];

  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  availability: AvailabilityDto[];
}

export class UpdateRefereeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  zone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  categoriesCertified?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReplaceAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  availability: AvailabilityDto[];
}

export class ListRefereesQuery {
  @IsOptional()
  @IsUUID()
  leagueId?: string;
}

export class AssignDto {
  @IsUUID()
  matchId: string;

  @IsUUID()
  refereeId: string;
}

export class AutoAssignDto {
  @IsUUID()
  leagueId: string;
}

export class ConfirmDto {
  @IsBoolean()
  confirmed: boolean;
}

export class ListAssignmentsQuery {
  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @IsOptional()
  @IsString()
  matchIds?: string;
}

export class CheckAssignmentQuery {
  @IsUUID()
  matchId: string;

  @IsEmail()
  email: string;
}
