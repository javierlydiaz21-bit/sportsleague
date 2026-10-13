import { ButtonLink, EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <EmptyState
      className="mt-10"
      title="No encontramos esta página"
      description="Puede que la liga aún no esté aprobada o que el enlace sea incorrecto."
      action={<ButtonLink href="/">Volver al inicio</ButtonLink>}
    />
  );
}
