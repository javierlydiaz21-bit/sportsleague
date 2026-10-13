import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth-forms';
import { PageSpinner } from '@/components/ui';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
