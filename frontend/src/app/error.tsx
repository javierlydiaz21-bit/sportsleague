'use client';

import { Button, EmptyState } from '@/components/ui';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      className="mt-10"
      title="No pudimos cargar esta página"
      description="Alguno de los servicios no respondió. Si la plataforma acaba de iniciar, espera unos segundos e inténtalo de nuevo."
      action={<Button onClick={reset}>Reintentar</Button>}
    />
  );
}
