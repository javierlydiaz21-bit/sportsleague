'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

/** Páginas cuya vista sin sesión ocupa todo el ancho (LandingSimulator y LigasPublicas). */
const PUBLIC_FULL_WIDTH = new Set(['/', '/ligas']);

/** Contenedor principal: ancho de lectura, salvo las vistas públicas a ancho completo. */
export function PageContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const fullWidth = PUBLIC_FULL_WIDTH.has(pathname) && status !== 'authenticated';
  return <main className={fullWidth ? undefined : 'mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12'}>{children}</main>;
}
