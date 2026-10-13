import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { CurrentUser, Roles, type AuthUser } from '../chassis';
import { ListUsersQuery, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

/** Gestión de cuentas: exclusivo del administrador. */
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Get('stats')
  stats() {
    return this.users.stats();
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() admin: AuthUser) {
    return this.users.update(id, dto, admin);
  }
}
