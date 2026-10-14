'use client';

import { useEffect, type ReactNode } from 'react';
import { ToastProvider } from '@/components/overlay';
import { wakeServices } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: ReactNode }) {
  // Al abrir la web (y al volver a la pestaña) se avisa al gateway para que despierte los servicios
  // dormidos (Render Free) mientras el usuario lee o escribe sus datos.
  useEffect(() => {
    wakeServices();
    const onVisible = () => {
      if (document.visibilityState === 'visible') wakeServices();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
