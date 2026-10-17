import * as SecureStore from 'expo-secure-store';
import type { User } from './types';

/** Sesión guardada en el almacenamiento cifrado del sistema (Keychain en iOS, Keystore en Android). */
export interface StoredSession {
  accessToken: string | null;
  refreshToken: string;
  user: User;
}

const KEYS = {
  access: 'sl_access_token',
  refresh: 'sl_refresh_token',
  user: 'sl_user',
} as const;

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, user] = await Promise.all([
    SecureStore.getItemAsync(KEYS.access),
    SecureStore.getItemAsync(KEYS.refresh),
    SecureStore.getItemAsync(KEYS.user),
  ]);
  if (!refreshToken || !user) return null;
  try {
    return { accessToken, refreshToken, user: JSON.parse(user) as User };
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  await Promise.all([
    session.accessToken
      ? SecureStore.setItemAsync(KEYS.access, session.accessToken)
      : SecureStore.deleteItemAsync(KEYS.access),
    SecureStore.setItemAsync(KEYS.refresh, session.refreshToken),
    SecureStore.setItemAsync(KEYS.user, JSON.stringify(session.user)),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
