'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { homeFor, useAuth } from '@/lib/auth';
import type { Role, User } from '@/lib/types';
import { ButtonLink, EmptyState, PageSpinner } from './ui';

/** Protege las vistas del panel: exige sesión y, opcionalmente, ciertos roles. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: (user: User) => ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== 'authenticated' || !user) return <PageSpinner />;
  if (roles && !roles.includes(user.role)) {
    return (
      <EmptyState
        className="mt-10"
        title="No tienes acceso a esta sección"
        description="Tu cuenta no tiene el rol necesario para ver esta página."
        action={
          <ButtonLink href={homeFor(user.role)} variant="secondary">
            Ir a mi inicio
          </ButtonLink>
        }
      />
    );
  }
  return <>{children(user)}</>;
}
