import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto por solicitud (o por evento consumido). Permite que todos los logs
 * incluyan automáticamente requestId, userId y matchId sin pasarlos a mano.
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  matchId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function currentContext(): RequestContext | undefined {
  return requestContext.getStore();
}
