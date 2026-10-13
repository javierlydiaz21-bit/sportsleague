import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Public, Roles, type AuthUser } from '../chassis';
import {
  AssignDto,
  AutoAssignDto,
  CheckAssignmentQuery,
  ConfirmDto,
  CreateRefereeDto,
  ListAssignmentsQuery,
  ListRefereesQuery,
  ReplaceAvailabilityDto,
  UpdateRefereeDto,
} from './dto';
import { RefereesService } from './referees.service';

@Controller('referees')
export class RefereesController {
  constructor(private readonly referees: RefereesService) {}

  @Post()
  @Roles('ORGANIZER', 'ADMIN')
  create(@Body() dto: CreateRefereeDto, @CurrentUser() user: AuthUser) {
    return this.referees.create(dto, user);
  }

  @Get()
  @Roles('ORGANIZER', 'ADMIN')
  list(@Query() query: ListRefereesQuery, @CurrentUser() user: AuthUser) {
    return this.referees.list(query, user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.referees.myProfiles(user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRefereeDto, @CurrentUser() user: AuthUser) {
    return this.referees.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.referees.remove(id, user);
  }

  @Put(':id/availability')
  availability(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceAvailabilityDto, @CurrentUser() user: AuthUser) {
    return this.referees.replaceAvailability(id, dto.availability, user);
  }

  @Get(':id/assignments')
  assignments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.referees.refereeAssignments(id, user);
  }
}

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly referees: RefereesService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.referees.myAssignments(user);
  }

  @Get()
  @Roles('ORGANIZER', 'ADMIN')
  list(@Query() query: ListAssignmentsQuery, @CurrentUser() user: AuthUser) {
    return this.referees.listAssignments(query, user);
  }

  @Post()
  @Roles('ORGANIZER', 'ADMIN')
  assign(@Body() dto: AssignDto, @CurrentUser() user: AuthUser) {
    return this.referees.assignManually(dto, user);
  }

  @Post('auto')
  @Roles('ORGANIZER', 'ADMIN')
  auto(@Body() dto: AutoAssignDto, @CurrentUser() user: AuthUser) {
    return this.referees.autoAssignLeague(dto.leagueId, user);
  }

  @Put(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmDto, @CurrentUser() user: AuthUser) {
    return this.referees.confirm(id, dto.confirmed, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.referees.removeAssignment(id, user);
  }
}

/** Uso exclusivo entre servicios: el Live Score Service verifica aquí los permisos del árbitro. */
@Controller('internal')
export class InternalController {
  constructor(private readonly referees: RefereesService) {}

  @Public()
  @Get('assignments/check')
  check(@Query() query: CheckAssignmentQuery) {
    return this.referees.check(query.matchId, query.email);
  }
}
