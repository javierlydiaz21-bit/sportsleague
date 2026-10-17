import type { User } from './types';

/**
 * Versión web (solo para probar con `npx expo start --web` o el export web): expo-secure-store no
 * existe en el navegador, así que se usa localStorage. En el teléfono se usa token-storage.ts.
 */
export interface StoredSession {
  accessToken: string | null;
  refreshToken: string;
  user: User;
}

const KEY = 'sl_mobile_session';

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const session = raw ? (JSON.parse(raw) as StoredSession) : null;
    return session?.refreshToken && session.user ? session : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(session));
  } catch {
    // almacenamiento no disponible (modo privado)
  }
}

export async function clearSession(): Promise<void> {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // almacenamiento no disponible
  }
}
