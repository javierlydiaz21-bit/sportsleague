import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser, Public, Roles, isAdmin, type AuthUser } from '../chassis';
import { NotificationsService } from './notifications.service';

class LimitQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

class PreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}

class SubscribeDto {
  @IsUUID()
  leagueId: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  inbox(@CurrentUser() user: AuthUser, @Query() query: LimitQuery) {
    return this.notifications.inbox(user, query.limit);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user);
  }

  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser) {
    return this.notifications.preferences(user);
  }

  @Put('preferences')
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: PreferencesDto) {
    return this.notifications.updatePreferences(user, dto);
  }

  @Post('test')
  test(@CurrentUser() user: AuthUser) {
    return this.notifications.test(user);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Get('deliveries')
  @Roles('ADMIN')
  deliveries(@Query() query: LimitQuery) {
    return this.notifications.deliveries(query.limit);
  }

  /** GET /notifications/{userId} (documento de arquitectura): propio usuario o administrador. */
  @Get(':userId')
  byUser(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: AuthUser, @Query() query: LimitQuery) {
    if (userId !== user.id && !isAdmin(user)) throw new ForbiddenException('Solo puedes ver tus notificaciones');
    return userId === user.id ? this.notifications.inbox(user, query.limit) : this.notifications.inboxOf(userId, query.limit);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.notifications.markRead(id, user);
  }
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.notifications.mySubscriptions(user);
  }

  @Public()
  @Get('leagues/:leagueId')
  followers(@Param('leagueId', ParseUUIDPipe) leagueId: string) {
    return this.notifications.followers(leagueId);
  }

  @Post()
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: AuthUser) {
    return this.notifications.subscribe(dto.leagueId, user);
  }

  @Delete(':leagueId')
  unsubscribe(@Param('leagueId', ParseUUIDPipe) leagueId: string, @CurrentUser() user: AuthUser) {
    return this.notifications.unsubscribe(leagueId, user);
  }
}
