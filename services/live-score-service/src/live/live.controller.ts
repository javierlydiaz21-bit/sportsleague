import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { AddEventDto, CompleteMatchDto, ListLiveQuery } from './dto';
import { LiveService } from './live.service';

@Controller()
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Post('matches/:id/start')
  @HttpCode(200)
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.live.start(id, user);
  }

  /** Registro puntual de eventos desde la app de árbitros (REST); la difusión es por WebSocket. */
  @Post('matches/:id/events')
  addEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddEventDto, @CurrentUser() user: AuthUser) {
    return this.live.addEvent(id, dto, user);
  }

  @Delete('matches/:id/events/:eventId')
  deleteEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.live.deleteEvent(id, eventId, user);
  }

  @Post('matches/:id/complete')
  @HttpCode(200)
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteMatchDto, @CurrentUser() user: AuthUser) {
    return this.live.complete(id, dto, user);
  }

  @Public()
  @Get('matches/:id/live')
  snapshot(@Param('id', ParseUUIDPipe) id: string) {
    return this.live.snapshot(id);
  }

  @Public()
  @Get('live/matches')
  list(@Query() query: ListLiveQuery) {
    return this.live.list(query);
  }
}
