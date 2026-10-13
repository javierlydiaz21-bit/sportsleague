import type { NextFunction, Request, Response } from 'express';
import { TokenExpiredError, verify, type JwtPayload } from 'jsonwebtoken';
import { currentContext, log, type AuthUser, type Role } from '../chassis';
import { isBlocked, isPublicWrite, requiresAdmin } from './routes';

/** Cabeceras que solo el gateway puede establecer (se eliminan si las envía un cliente). */
const TRUSTED_HEADERS = ['x-user-id', 'x-user-role', 'x-user-email', 'x-user-name', 'x-internal-token'];

export interface AuthMiddlewareOptions {
  secret: string;
  internalToken: string;
  /** Devuelve true si el usuario fue suspendido por el administrador (lista en Redis). */
  isSuspended?: (userId: string) => Promise<boolean>;
}

export type GatewayRequest = Request & { user?: AuthUser };

function reject(res: Response, status: number, message: string, code?: string): void {
  res.status(status).json({ statusCode: status, message, ...(code ? { code } : {}) });
}

/**
 * Autenticación centralizada: valida firma y expiración del JWT y, si es
 * válido, propaga la identidad a los microservicios en cabeceras x-user-*.
 *  - Lecturas (GET): públicas; si llega un token, debe ser válido.
 *  - Escrituras: requieren sesión (salvo login/registro/refresh).
 *  - Rutas de administración: requieren rol ADMIN.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (req: GatewayRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.method === 'OPTIONS') return next();
    for (const header of TRUSTED_HEADERS) delete req.headers[header];

    const path = req.path;
    if (isBlocked(path)) return reject(res, 404, 'Recurso no encontrado');

    let user: AuthUser | undefined;
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = verify(authorization.slice(7), options.secret, {
          algorithms: ['HS256'],
          issuer: 'sportsleague-auth',
          audience: 'sportsleague',
        }) as JwtPayload;
        user = {
          id: String(payload.sub),
          role: payload.role as Role,
          email: String(payload.email ?? ''),
          name: String(payload.name ?? ''),
        };
      } catch (err) {
        const expired = err instanceof TokenExpiredError;
        return reject(res, 401, expired ? 'La sesión expiró' : 'Token inválido', expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID');
      }
      if (options.isSuspended && (await options.isSuspended(user.id))) {
        log.warn('suspended_user_blocked', { userId: user.id });
        return reject(res, 403, 'Tu cuenta está suspendida. Contacta al administrador.', 'ACCOUNT_SUSPENDED');
      }
    }

    const isRead = req.method === 'GET' || req.method === 'HEAD';
    if (path.startsWith('/api/') && !user && !isRead && !isPublicWrite(req.method, path)) {
      return reject(res, 401, 'Debes iniciar sesión');
    }
    if (requiresAdmin(req.method, path)) {
      if (!user) return reject(res, 401, 'Debes iniciar sesión');
      if (user.role !== 'ADMIN') return reject(res, 403, 'Solo el administrador puede acceder a este recurso');
    }

    req.user = user;
    if (user) {
      req.headers['x-user-id'] = user.id;
      req.headers['x-user-role'] = user.role;
      req.headers['x-user-email'] = user.email;
      req.headers['x-user-name'] = encodeURIComponent(user.name);
    }
    req.headers['x-internal-token'] = options.internalToken;
    const requestId = currentContext()?.requestId;
    if (requestId) req.headers['x-request-id'] = requestId;
    next();
  };
}

/** Rechaza explícitamente orígenes de navegador no autorizados (configuración de CORS). */
export function rejectUnknownOrigins(allowed: string[]) {
  const origins = new Set(allowed);
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) return reject(res, 403, 'Origen no permitido por la política CORS');
    next();
  };
}
