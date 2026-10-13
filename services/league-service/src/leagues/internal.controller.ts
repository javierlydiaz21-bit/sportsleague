import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Public } from '../chassis';
import { LeaguesService } from './leagues.service';

/**
 * Endpoints de uso exclusivo entre microservicios (el API Gateway bloquea /api/v1/internal).
 * El Fixture Service obtiene aquí, de forma síncrona, la estructura completa de la temporada.
 */
@Controller('internal')
export class InternalController {
  constructor(private readonly leagues: LeaguesService) {}

  @Public()
  @Get('seasons/:id/structure')
  structure(@Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.seasonStructure(id);
  }
}
