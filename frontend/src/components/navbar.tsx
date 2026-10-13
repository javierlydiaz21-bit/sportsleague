'use client';

import { Bell, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/format';
import { ButtonLink, cn } from './ui';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-fg">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-fg" />
        <circle cx="16" cy="16" r="7.5" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <path d="M8.5 16h15" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      SportsLeague
    </Link>
  );
}

function useUnreadCount(enabled: boolean): number {
  const { api } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      api
        .get<{ unread: number }>('/notifications/unread-count')
        .then((res) => alive && setCount(res.unread))
        .catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [api, enabled]);
  return enabled ? count : 0;
}

export function Navbar() {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount(status === 'authenticated');

  useEffect(() => setOpen(false), [pathname]);

  const links: { href: string; label: string }[] = [{ href: '/ligas', label: 'Ligas' }];
  if (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') links.push({ href: '/panel', label: 'Mis ligas' });
  if (user?.role === 'REFEREE') links.push({ href: '/panel/arbitro', label: 'Mis partidos' });
  if (user?.role === 'ADMIN') links.push({ href: '/admin', label: 'Administración' });

  const isActive = (href: string) => (href === '/panel' ? pathname === '/panel' || pathname.startsWith('/panel/ligas') : pathname.startsWith(href));

  const onLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn('text-sm transition', isActive(link.href) ? 'font-medium text-fg' : 'text-muted hover:text-fg')}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {status === 'authenticated' && user ? (
            <>
              <Link
                href="/panel/notificaciones"
                className="relative rounded-lg p-2 text-muted transition hover:bg-surface hover:text-fg"
                aria-label="Notificaciones"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <div className="ml-1 text-right leading-tight">
                <p className="text-[13px] font-medium text-fg">{user.name}</p>
                <p className="text-[11px] text-muted">{ROLE_LABEL[user.role]}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="ml-1 rounded-lg p-2 text-muted transition hover:bg-surface hover:text-fg"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : status === 'anonymous' ? (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Iniciar sesión
              </ButtonLink>
              <ButtonLink href="/registro" size="sm">
                Crear cuenta
              </ButtonLink>
            </>
          ) : (
            <div className="h-8 w-40" />
          )}
        </div>

        <button type="button" className="rounded-lg p-2 text-muted md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menú">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-line px-4 pb-4 md:hidden">
          <div className="flex flex-col py-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="py-2 text-sm text-fg">
                {link.label}
              </Link>
            ))}
            {status === 'authenticated' && (
              <Link href="/panel/notificaciones" className="py-2 text-sm text-fg">
                Notificaciones {unread > 0 && `(${unread})`}
              </Link>
            )}
          </div>
          {status === 'authenticated' && user ? (
            <button type="button" onClick={onLogout} className="mt-1 text-sm text-muted">
              Cerrar sesión ({user.name})
            </button>
          ) : (
            <div className="flex gap-2">
              <ButtonLink href="/login" variant="secondary" size="sm">
                Iniciar sesión
              </ButtonLink>
              <ButtonLink href="/registro" size="sm">
                Crear cuenta
              </ButtonLink>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>SportsLeague · Plataforma de gestión de ligas deportivas amateur</p>
        <p>Fútbol · Básquet · Vóley — arquitectura de microservicios</p>
      </div>
    </footer>
  );
}
