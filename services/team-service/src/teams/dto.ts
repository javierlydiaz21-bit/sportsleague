import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const COLOR = /^#[0-9a-f]{6}$/i;

export class CreateTeamDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsUUID()
  homeVenueId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  coachName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @Matches(COLOR, { message: 'El color debe tener formato hexadecimal (#RRGGBB)' })
  color?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsUUID()
  homeVenueId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  coachName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @Matches(COLOR, { message: 'El color debe tener formato hexadecimal (#RRGGBB)' })
  color?: string;
}

export class ListTeamsQuery {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  leagueId?: string;

  /** ids separados por comas (composición de datos desde otros clientes). */
  @IsOptional()
  @IsString()
  ids?: string;
}

export class CreatePlayerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  lastName: string;

  @IsDateString()
  birthDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentId?: string;

  @IsOptional()
  @IsUrl()
  registrationDocUrl?: string;
}

export class BulkPlayersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => CreatePlayerDto)
  players: CreatePlayerDto[];
}

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentId?: string;

  @IsOptional()
  @IsUrl()
  registrationDocUrl?: string;
}

export class EligibilityDto {
  /** Solo el administrador puede fijar el estado manualmente (p. ej. tras revisar documentación). */
  @IsOptional()
  @IsIn(['ELIGIBLE', 'INELIGIBLE', 'PENDING'])
  status?: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class ListPlayersQuery {
  @IsOptional()
  @IsString()
  ids?: string;

  @IsOptional()
  @IsString()
  teamIds?: string;
}
