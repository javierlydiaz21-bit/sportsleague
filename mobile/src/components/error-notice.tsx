import type { ApiError } from '@/lib/api';
import { WAKING_MESSAGE } from '@/lib/api';
import { Button, Notice } from './ui';

/**
 * Aviso de error con «Reintentar». Con 502/503/504 o un error de red explica que los servicios de
 * Render Free se están despertando (tardan 30–60 s).
 */
export function ErrorNotice({
  error,
  onRetry,
  retrying,
  title = 'No se pudo completar la solicitud',
}: {
  error: ApiError;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
}) {
  const action = onRetry ? (
    <Button title="Reintentar" icon="refresh" size="sm" variant="secondary" onPress={onRetry} loading={retrying} />
  ) : undefined;
  if (error.waking) {
    return (
      <Notice tone="amber" icon="cloud-offline-outline" title={WAKING_MESSAGE} action={action}>
        El servidor gratuito se duerme tras unos minutos sin uso y tarda entre 30 y 60 segundos en arrancar.
      </Notice>
    );
  }
  return (
    <Notice tone="red" icon="alert-circle-outline" title={title} action={action}>
      {error.message}
    </Notice>
  );
}
