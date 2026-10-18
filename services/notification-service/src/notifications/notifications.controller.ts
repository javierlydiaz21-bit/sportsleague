import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CurrentUser, Public, Roles, isAdmin, type AuthUser } from '../chassis';
import { NotificationsService } from './notifications.service';
import { WebPusher } from './push';

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

const PUSH_ENDPOINT = { protocols: ['https'], require_protocol: true };

class PushKeysDto {
  @IsString()
  @MaxLength(200)
  p256dh: string;

  @IsString()
  @MaxLength(100)
  auth: string;
}

/** Suscripción que devuelve PushManager.subscribe() en el navegador (endpoint + claves). */
class PushSubscriptionDto {
  @IsUrl(PUSH_ENDPOINT)
  @MaxLength(1000)
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

class PushEndpointQuery {
  @IsUrl(PUSH_ENDPOINT)
  @MaxLength(1000)
  endpoint: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly pusher: WebPusher,
  ) {}

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

  /** Clave pública VAPID con la que el navegador se suscribe; null si el push real no está configurado. */
  @Public()
  @Get('push/public-key')
  pushPublicKey() {
    return { publicKey: this.pusher.enabled ? this.pusher.publicKey : null };
  }

  @Post('push/subscriptions')
  subscribePush(@CurrentUser() user: AuthUser, @Body() dto: PushSubscriptionDto, @Headers('user-agent') userAgent?: string) {
    return this.pusher.subscribe(user.id, dto, userAgent);
  }

  @Delete('push/subscriptions')
  unsubscribePush(@CurrentUser() user: AuthUser, @Query() query: PushEndpointQuery) {
    return this.pusher.unsubscribe(user.id, query.endpoint);
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
