'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { PageSpinner } from '@/components/ui';
import { hasStoredSession, useAuth } from '@/lib/auth';

/**
 * Muestra `anonymous` a los visitantes sin sesión y `children` a los usuarios con sesión.
 * La sesión solo se conoce en el navegador: mientras se comprueba se muestra la vista pública
 * (la que genera el servidor), salvo que haya rastro de una sesión previa; entonces, un spinner.
 */
export function SessionGate({ anonymous, children }: { anonymous: ReactNode; children: ReactNode }) {
  const { status } = useAuth();
  const [resuming, setResuming] = useState(false);

  useEffect(() => setResuming(hasStoredSession()), []);

  if (status === 'authenticated') return <>{children}</>;
  if (status === 'loading' && resuming) return <PageSpinner />;
  return <>{anonymous}</>;
}
