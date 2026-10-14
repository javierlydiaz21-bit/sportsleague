'use client';

import Link from 'next/link';
import { homeFor, useAuth } from '@/lib/auth';

const BUTTON =
  'rounded-md border-2 border-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-8 sm:text-[15px]';

/** Botones de la portada: sin sesión invita a iniciarla; con sesión lleva al panel de su rol. */
export function HeroActions({ className = '' }: { className?: string }) {
  const { user, status } = useAuth();
  const panel = status === 'authenticated' && user ? homeFor(user.role) : null;
  const primary = !panel ? { href: '/login', label: 'Iniciar sesión' } : panel !== '/' ? { href: panel, label: 'Ir a mi panel' } : null;

  return (
    <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
      {primary && (
        <Link href={primary.href} className={`${BUTTON} bg-white text-[#5a1428] hover:bg-white/85`}>
          {primary.label}
        </Link>
      )}
      <Link href="/ligas" className={`${BUTTON} hover:bg-white hover:text-[#5a1428]`}>
        Explorar ligas
      </Link>
    </div>
  );
}
