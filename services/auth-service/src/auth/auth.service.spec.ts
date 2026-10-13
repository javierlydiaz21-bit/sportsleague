import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createFakePrisma } from '../../test/fake-prisma';
import { InMemoryEventBus } from '../chassis';
import { AuthService } from './auth.service';

process.env.LOG_LEVEL = 'error';

describe('AuthService', () => {
  let prisma: ReturnType<typeof createFakePrisma>;
  let bus: InMemoryEventBus;
  let service: AuthService;
  const meta = { userAgent: 'jest', ip: '127.0.0.1' };

  beforeEach(() => {
    prisma = createFakePrisma();
    bus = new InMemoryEventBus();
    service = new AuthService(prisma, bus);
  });

  it('registra un organizador, publica user.registered y abre sesión', async () => {
    const session = await service.register({ name: 'Ana', email: 'ANA@liga.com', password: 'Clave123' }, meta);
    expect(session.user.email).toBe('ana@liga.com');
    expect(session.user.role).toBe('ORGANIZER');
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.csrfToken).toBeTruthy();
    expect(bus.published.map((e) => e.type)).toEqual(['user.registered']);
    expect(prisma._users[0].passwordHash).not.toBe('Clave123');
  });

  it('impide registrar dos veces el mismo correo', async () => {
    await service.register({ name: 'Ana', email: 'ana@liga.com', password: 'Clave123' }, meta);
    await expect(service.register({ name: 'Otra', email: 'ana@liga.com', password: 'Clave123' }, meta)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rechaza credenciales inválidas y cuentas suspendidas', async () => {
    await service.register({ name: 'Ana', email: 'ana@liga.com', password: 'Clave123' }, meta);
    await expect(service.login({ email: 'ana@liga.com', password: 'mala1234' }, meta)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    prisma._users[0].status = 'SUSPENDED';
    await expect(service.login({ email: 'ana@liga.com', password: 'Clave123' }, meta)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rota el refresh token y exige el token CSRF cuando viaja en cookie', async () => {
    const session = await service.register({ name: 'Ana', email: 'ana@liga.com', password: 'Clave123' }, meta);
    await expect(service.refresh(session.refreshToken, { viaCookie: true, meta })).rejects.toBeInstanceOf(ForbiddenException);

    const rotated = await service.refresh(session.refreshToken, { viaCookie: true, csrfToken: session.csrfToken, meta });
    expect(rotated.refreshToken).toBeTruthy();
    expect(rotated.refreshToken).not.toEqual(session.refreshToken);
    expect(prisma._tokens.filter((t: any) => t.revokedAt === null)).toHaveLength(1);
  });

  it('detecta la reutilización de un refresh token revocado y cierra todas las sesiones', async () => {
    const session = await service.register({ name: 'Ana', email: 'ana@liga.com', password: 'Clave123' }, meta);
    const rotated = await service.refresh(session.refreshToken, { viaCookie: false, meta });
    // Simula que el token viejo se reutiliza fuera de la ventana de gracia.
    prisma._tokens[0].revokedAt = new Date(Date.now() - 60_000);
    await expect(service.refresh(session.refreshToken, { viaCookie: false, meta })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refresh(rotated.refreshToken, { viaCookie: false, meta })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('crea la cuenta de administrador una sola vez', async () => {
    process.env.ADMIN_EMAIL = 'admin@test.com';
    await service.ensureAdminAccount();
    await service.ensureAdminAccount();
    const admins = prisma._users.filter((u: any) => u.role === 'ADMIN');
    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe('admin@test.com');
  });
});
