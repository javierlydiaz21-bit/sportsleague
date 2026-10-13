import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { compare, hash, hashSync } from 'bcryptjs';
import { EventBus, env, envInt, log } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto';
import { randomToken, sha256, signAccessToken } from './tokens';

export const BCRYPT_ROUNDS = 10;
const REUSE_GRACE_MS = 15_000;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  status: User['status'];
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface SessionResult {
  user: PublicUser;
  accessToken: string;
  expiresIn: number;
  /** Solo presente cuando se emite (o rota) un refresh token. */
  refreshToken?: string;
  csrfToken?: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly jwtSecret = env('JWT_SECRET', 'dev-jwt-secret-change-me');
  private readonly accessTtl = envInt('ACCESS_TOKEN_TTL_SECONDS', 900);
  private readonly refreshTtlDays = envInt('REFRESH_TOKEN_TTL_DAYS', 7);
  /** Hash ficticio para que un correo inexistente tarde lo mismo que una contraseña errónea. */
  private readonly dummyHash = hashSync('timing-equalizer', BCRYPT_ROUNDS);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureAdminAccount();
  }

  /** Crea (una sola vez) la cuenta de administrador definida por variables de entorno. */
  async ensureAdminAccount(): Promise<void> {
    const email = env('ADMIN_EMAIL', 'admin@sportsleague.com').trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== 'ADMIN' || existing.status !== 'ACTIVE') {
        await this.prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', status: 'ACTIVE' } });
      }
      return;
    }
    try {
      await this.prisma.user.create({
        data: {
          email,
          name: env('ADMIN_NAME', 'Administrador'),
          passwordHash: await hash(env('ADMIN_PASSWORD', 'Admin12345'), BCRYPT_ROUNDS),
          role: 'ADMIN',
        },
      });
      log.info('admin_account_created', { email });
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err; // otra réplica ya lo creó
    }
  }

  async register(dto: RegisterDto, meta: SessionMeta): Promise<SessionResult> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Ya existe una cuenta con ese correo');

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
        role: dto.role ?? 'ORGANIZER',
      },
    });
    log.info('user_registered', { userId: user.id, role: user.role });
    await this.bus.publish('user.registered', { userId: user.id, email: user.email, name: user.name, role: user.role });
    return this.startSession(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<SessionResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) {
      log.warn('login_failed', { email });
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Tu cuenta está suspendida. Contacta al administrador.');
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.startSession(updated, meta);
  }

  /**
   * Rotación de refresh tokens: cada uso emite uno nuevo y revoca el anterior.
   * Si se reutiliza un token ya revocado (posible robo) se cierran todas las sesiones.
   */
  async refresh(
    token: string | undefined,
    options: { csrfToken?: string; viaCookie: boolean; meta: SessionMeta },
  ): Promise<SessionResult> {
    if (!token) throw new UnauthorizedException('La sesión expiró, inicia sesión de nuevo');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('La sesión expiró, inicia sesión de nuevo');

    // Protección CSRF: el refresh vía cookie exige el token anti-CSRF emitido al iniciar sesión.
    if (options.viaCookie && (!options.csrfToken || sha256(options.csrfToken) !== record.csrfHash)) {
      throw new ForbiddenException('Token CSRF inválido');
    }
    if (record.user.status !== 'ACTIVE') throw new ForbiddenException('Tu cuenta está suspendida');

    if (record.revokedAt) {
      const concurrent = record.replacedBy && Date.now() - record.revokedAt.getTime() < REUSE_GRACE_MS;
      if (concurrent) return this.accessOnly(record.user);
      await this.revokeAll(record.userId);
      log.warn('refresh_token_reuse_detected', { userId: record.userId });
      throw new UnauthorizedException('Sesión inválida, inicia sesión de nuevo');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('La sesión expiró, inicia sesión de nuevo');
    }

    const nextToken = randomToken();
    const rotated = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count === 0) return false; // otra solicitud lo rotó en paralelo
      const created = await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: sha256(nextToken),
          csrfHash: record.csrfHash,
          expiresAt: this.refreshExpiry(),
          userAgent: options.meta.userAgent?.slice(0, 300),
          ip: options.meta.ip,
        },
      });
      await tx.refreshToken.update({ where: { id: record.id }, data: { replacedBy: created.id } });
      return true;
    });
    if (!rotated) return this.accessOnly(record.user);
    return { ...this.accessOnly(record.user), refreshToken: nextToken };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const data: { name?: string; passwordHash?: string } = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.newPassword) {
      if (!dto.currentPassword || !(await compare(dto.currentPassword, user.passwordHash))) {
        throw new BadRequestException('La contraseña actual no es correcta');
      }
      data.passwordHash = await hash(dto.newPassword, BCRYPT_ROUNDS);
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return toPublicUser(updated);
  }

  private async startSession(user: User, meta: SessionMeta): Promise<SessionResult> {
    const refreshToken = randomToken();
    const csrfToken = randomToken(24);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        csrfHash: sha256(csrfToken),
        expiresAt: this.refreshExpiry(),
        userAgent: meta.userAgent?.slice(0, 300),
        ip: meta.ip,
      },
    });
    return { ...this.accessOnly(user), refreshToken, csrfToken };
  }

  private accessOnly(user: User): SessionResult {
    return {
      user: toPublicUser(user),
      accessToken: signAccessToken(user, this.jwtSecret, this.accessTtl),
      expiresIn: this.accessTtl,
    };
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }

  get refreshCookieMaxAgeMs(): number {
    return this.refreshTtlDays * 24 * 60 * 60 * 1000;
  }
}
