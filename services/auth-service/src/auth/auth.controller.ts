import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { AuthService, type SessionMeta, type SessionResult } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto, UpdateProfileDto } from './dto';
import { readCookie } from './tokens';

export const REFRESH_COOKIE = 'sl_refresh';

function meta(req: Request): SessionMeta {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.register(dto, meta(req));
    return this.respond(res, session, dto.client === 'mobile');
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.login(dto, meta(req));
    return this.respond(res, session, dto.client === 'mobile');
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const viaCookie = !dto.refreshToken;
    const token = dto.refreshToken ?? readCookie(req.headers.cookie, REFRESH_COOKIE);
    const csrf = req.headers['x-csrf-token'];
    const session = await this.auth.refresh(token, {
      viaCookie,
      csrfToken: typeof csrf === 'string' ? csrf : undefined,
      meta: meta(req),
    });
    return this.respond(res, session, !viaCookie);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(dto.refreshToken ?? readCookie(req.headers.cookie, REFRESH_COOKIE));
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  /** El refresh token viaja en cookie httpOnly (web) o en el cuerpo (apps móviles). */
  private respond(res: Response, session: SessionResult, includeRefreshInBody: boolean) {
    const { refreshToken, ...body } = session;
    if (refreshToken && !includeRefreshInBody) {
      res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    }
    return includeRefreshInBody && refreshToken ? { ...body, refreshToken } : body;
  }

  private cookieOptions(): CookieOptions {
    const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax') as CookieOptions['sameSite'];
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite,
      path: '/api/v1/auth',
      maxAge: this.auth.refreshCookieMaxAgeMs,
    };
  }
}
