'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Contenedor principal. La portada (/) ocupa todo el ancho; el resto de páginas, el ancho de lectura. */
export function PageContainer({ children }: { children: ReactNode }) {
  const fullWidth = usePathname() === '/';
  return <main className={fullWidth ? undefined : 'mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12'}>{children}</main>;
}
