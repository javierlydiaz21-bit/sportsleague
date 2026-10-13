import { createHash, randomBytes } from 'node:crypto';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';
import type { Role } from '../chassis';

export const JWT_ISSUER = 'sportsleague-auth';
export const JWT_AUDIENCE = 'sportsleague';

export interface TokenSubject {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Access token de corta duración (lo valida el API Gateway en cada solicitud). */
export function signAccessToken(user: TokenSubject, secret: string, ttlSeconds: number): string {
  return sign({ email: user.email, name: user.name, role: user.role }, secret, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: ttlSeconds,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return verify(token, secret, { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE }) as JwtPayload;
}

/** Token opaco aleatorio (refresh token / token CSRF). */
export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}
