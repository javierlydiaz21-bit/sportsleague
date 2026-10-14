'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, SERVICE_WAKING_MESSAGE, isUnavailableStatus, request } from './api';
import { PUBLIC_API_URL } from './config';
import type { Role, User } from './types';

const CSRF_KEY = 'sl_csrf';

interface SessionResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
  csrfToken?: string;
}

export interface Api {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
}

interface AuthContextValue {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login(email: string, password: string): Promise<User>;
  register(input: { name: string; email: string; password: string; role: Exclude<Role, 'ADMIN'> }): Promise<User>;
  logout(): Promise<void>;
  api: Api;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readCsrf(): string | null {
  try {
    return localStorage.getItem(CSRF_KEY);
  } catch {
    return null;
  }
}

/** Hay rastro de una sesión iniciada en este navegador (se confirma al renovarla). */
export function hasStoredSession(): boolean {
  return readCsrf() !== null;
}

function writeCsrf(value: string | null): void {
  try {
    if (value) localStorage.setItem(CSRF_KEY, value);
    else localStorage.removeItem(CSRF_KEY);
  } catch {
    // almacenamiento no disponible (modo privado)
  }
}

async function authPost(path: string, body: unknown, csrf?: string | null): Promise<Response> {
  try {
    return await fetch(`${PUBLIC_API_URL}/api/v1/auth/${path}`, {
      method: 'POST',
      credentials: 'include', // la cookie httpOnly del refresh token viaja solo hacia /api/v1/auth
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, SERVICE_WAKING_MESSAGE);
  }
}

async function readError(res: Response): Promise<ApiError> {
  if (isUnavailableStatus(res.status)) return new ApiError(res.status, SERVICE_WAKING_MESSAGE);
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join('. ') : (data.message ?? 'No se pudo completar la solicitud');
  return new ApiError(res.status, message, data.code, data);
}

/**
 * Sesión: el access token (15 min) vive solo en memoria; el refresh token en una
 * cookie httpOnly. Al recargar la página se renueva la sesión con el token CSRF.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const token = useRef<string | null>(null);
  const pending = useRef<Promise<string | null> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySession = useCallback((session: SessionResponse) => {
    token.current = session.accessToken;
    if (session.csrfToken) writeCsrf(session.csrfToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    token.current = null;
    writeCsrf(null);
    setUser(null);
    setStatus('anonymous');
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const refreshRef = useRef<() => Promise<string | null>>(async () => null);

  /** Renueva el access token un minuto antes de que expire. */
  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void refreshRef.current(), Math.max(30, expiresIn - 60) * 1000);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (pending.current) return pending.current;
    const csrf = readCsrf();
    if (!csrf) return null;
    pending.current = (async () => {
      try {
        const res = await authPost('refresh', {}, csrf);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) clearSession();
          return null;
        }
        const session = (await res.json()) as SessionResponse;
        applySession(session);
        scheduleRefresh(session.expiresIn);
        return session.accessToken;
      } catch {
        return null;
      } finally {
        pending.current = null;
      }
    })();
    return pending.current;
  }, [applySession, clearSession, scheduleRefresh]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    void refresh().then((value) => {
      if (!value) setStatus((current) => (current === 'loading' ? 'anonymous' : current));
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  const call = useCallback(
    async <T,>(path: string, method = 'GET', json?: unknown): Promise<T> => {
      try {
        return await request<T>(path, { method, json, token: token.current });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && readCsrf()) {
          const renewed = await refresh();
          if (renewed) return request<T>(path, { method, json, token: renewed });
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
      patch: (path, body) => call(path, 'PATCH', body ?? {}),
      del: (path) => call(path, 'DELETE'),
    }),
    [call],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authPost('login', { email, password });
      if (!res.ok) throw await readError(res);
      const session = (await res.json()) as SessionResponse;
      applySession(session);
      scheduleRefresh(session.expiresIn);
      return session.user;
    },
    [applySession, scheduleRefresh],
  );

  const register = useCallback<AuthContextValue['register']>(
    async (input) => {
      const res = await authPost('register', input);
      if (!res.ok) throw await readError(res);
      const session = (await res.json()) as SessionResponse;
      applySession(session);
      scheduleRefresh(session.expiresIn);
      return session.user;
    },
    [applySession, scheduleRefresh],
  );

  const logout = useCallback(async () => {
    try {
      await authPost('logout', {}, readCsrf());
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ user, status, login, register, logout, api }), [user, status, login, register, logout, api]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

/** Ruta de inicio según el rol del usuario. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'REFEREE':
      return '/panel/arbitro';
    case 'ORGANIZER':
      return '/panel';
    default:
      return '/';
  }
}
