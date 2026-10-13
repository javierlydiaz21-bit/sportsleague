import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export type Role = 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'SPECTATOR';

/** Identidad del usuario: el API Gateway valida el JWT y la propaga en cabeceras x-user-*. */
export interface AuthUser {
  id: string;
  role: Role;
  email: string;
  name: string;
}

export const IS_PUBLIC_KEY = 'chassis:isPublic';
export const IS_OPEN_KEY = 'chassis:isOpen';
export const ROLES_KEY = 'chassis:roles';

/** Endpoint accesible sin sesión (pero siempre a través del API Gateway). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
/** Endpoint abierto incluso sin token interno (health check y métricas). */
export const OpenEndpoint = () => SetMetadata(IS_OPEN_KEY, true);
/** Restringe el endpoint a ciertos roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

type RequestWithUser = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => ctx.switchToHttp().getRequest<RequestWithUser>().user,
);

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function userFromHeaders(headers: Request['headers']): AuthUser | undefined {
  const id = header(headers['x-user-id']);
  const role = header(headers['x-user-role']) as Role | undefined;
  if (!id || !role) return undefined;
  return {
    id,
    role,
    email: header(headers['x-user-email']) ?? '',
    name: safeDecode(header(headers['x-user-name']) ?? ''),
  };
}

export function isInternalTokenValid(received: string | undefined, expected: string | undefined): boolean {
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Guard global de cada microservicio:
 *  1. Exige el token interno (las solicitudes solo pueden llegar desde el gateway u otro servicio).
 *  2. Reconstruye el usuario a partir de las cabeceras firmadas por el gateway.
 *  3. Aplica @Public() y @Roles().
 */
@Injectable()
export class AuthContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_OPEN_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    if (!isInternalTokenValid(header(req.headers['x-internal-token']), process.env.INTERNAL_API_TOKEN)) {
      throw new UnauthorizedException('Acceso directo no permitido: usa el API Gateway');
    }

    req.user = userFromHeaders(req.headers);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);

    if (!req.user && (!isPublic || roles)) throw new UnauthorizedException('Debes iniciar sesión');
    if (roles && req.user && !roles.includes(req.user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}

export function isAdmin(user?: AuthUser): boolean {
  return user?.role === 'ADMIN';
}

export function isOwnerOrAdmin(user: AuthUser | undefined, ownerId: string): boolean {
  return !!user && (user.role === 'ADMIN' || user.id === ownerId);
}

export function assertOwnerOrAdmin(
  user: AuthUser | undefined,
  ownerId: string,
  message = 'Solo el organizador de la liga puede realizar esta acción',
): asserts user is AuthUser {
  if (!user) throw new UnauthorizedException('Debes iniciar sesión');
  if (!isOwnerOrAdmin(user, ownerId)) throw new ForbiddenException(message);
}
