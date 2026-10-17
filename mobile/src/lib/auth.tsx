import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, isApiError, request } from './api';
import * as storage from './token-storage';
import type { SessionResponse, User } from './types';

export interface Api {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: Status;
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  api: Api;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sesión de la app móvil: el login con client: 'mobile' devuelve el refresh token en el cuerpo
 * (la web lo recibe en una cookie httpOnly). Ambos tokens se guardan con expo-secure-store.
 * Si una petición responde 401, se renueva el access token una sola vez y se repite.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const accessToken = useRef<string | null>(null);
  const refreshToken = useRef<string | null>(null);
  const pendingRefresh = useRef<Promise<string | null> | null>(null);

  const clearLocal = useCallback(async () => {
    accessToken.current = null;
    refreshToken.current = null;
    setUser(null);
    setStatus('anonymous');
    await storage.clearSession().catch(() => undefined);
  }, []);

  const applySession = useCallback(async (session: SessionResponse) => {
    accessToken.current = session.accessToken;
    // En una renovación concurrente el servidor puede no rotar el refresh token: se conserva el actual.
    if (session.refreshToken) refreshToken.current = session.refreshToken;
    setUser(session.user);
    setStatus('authenticated');
    if (refreshToken.current) {
      await storage
        .saveSession({ accessToken: session.accessToken, refreshToken: refreshToken.current, user: session.user })
        .catch(() => undefined);
    }
  }, []);

  /** POST /auth/refresh con { refreshToken }. Una sola solicitud aunque fallen varias a la vez. */
  const refresh = useCallback((): Promise<string | null> => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const token = refreshToken.current;
    if (!token) return Promise.resolve(null);
    const pending = (async () => {
      try {
        const session = await request<SessionResponse>('/auth/refresh', { method: 'POST', json: { refreshToken: token } });
        await applySession(session);
        return session.accessToken;
      } catch (err) {
        // 401/403: el refresh token caducó o fue revocado → se cierra la sesión local.
        if (isApiError(err) && (err.status === 401 || err.status === 403)) {
          await clearLocal();
          return null;
        }
        throw err; // servicios despertando u otro error: la sesión se conserva
      } finally {
        pendingRefresh.current = null;
      }
    })();
    pendingRefresh.current = pending;
    return pending;
  }, [applySession, clearLocal]);

  const call = useCallback(
    async <T,>(path: string, method = 'GET', json?: unknown): Promise<T> => {
      try {
        return await request<T>(path, { method, json, token: accessToken.current });
      } catch (err) {
        if (isApiError(err) && err.status === 401 && refreshToken.current) {
          const renewed = await refresh();
          if (renewed) return request<T>(path, { method, json, token: renewed });
          throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
        }
        throw err;
      }
    },
    [refresh],
  );

  const api = useMemo<Api>(
    () => ({
      get: (path) => call(path),
      post: (path, body) => call(path, 'POST', body ?? {}),
      put: (path, body) => call(path, 'PUT', body ?? {}),
      del: (path) => call(path, 'DELETE'),
    }),
    [call],
  );

  /** Al abrir la app se actualizan los datos del usuario guardado (p. ej. si cambió su rol). */
  const revalidate = useEffectEvent(() => {
    call<User>('/auth/me')
      .then((fresh) => {
        setUser(fresh);
        if (refreshToken.current) {
          void storage
            .saveSession({ accessToken: accessToken.current, refreshToken: refreshToken.current, user: fresh })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
  });

  useEffect(() => {
    let active = true;
    storage
      .loadSession()
      .catch(() => null)
      .then((stored) => {
        if (!active) return;
        if (!stored) {
          setStatus('anonymous');
          return;
        }
        accessToken.current = stored.accessToken;
        refreshToken.current = stored.refreshToken;
        setUser(stored.user);
        setStatus('authenticated');
        revalidate();
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await request<SessionResponse>('/auth/login', {
        method: 'POST',
        json: { email: email.trim(), password, client: 'mobile' },
      });
      if (!session.refreshToken) throw new ApiError(-1, 'El servidor no devolvió el token de renovación de la sesión.');
      refreshToken.current = session.refreshToken;
      await applySession(session);
      return session.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const token = refreshToken.current;
    await clearLocal();
    // Revoca el refresh token en el servidor (si falla, igual caduca solo).
    if (token) void request('/auth/logout', { method: 'POST', json: { refreshToken: token } }).catch(() => undefined);
  }, [clearLocal]);

  const value = useMemo(() => ({ user, status, login, logout, api }), [user, status, login, logout, api]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
