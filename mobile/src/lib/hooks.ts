import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { toApiError, type ApiError } from './api';

/** Mientras los servicios de Render Free despiertan, se reintenta solo cada 15 s (hasta ~1,5 min). */
const AUTO_RETRY_MS = 15_000;
const MAX_AUTO_RETRIES = 6;

interface LoaderData<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  refreshing: boolean;
}

export interface Loader<T> extends LoaderData<T> {
  /** Vuelve a cargar mostrando el indicador de carga (botón «Reintentar»). */
  reload(): void;
  /** Recarga para «deslizar para actualizar». */
  refresh(): void;
  /** Recarga en segundo plano, sin indicadores (sondeo periódico). */
  revalidate(): void;
}

/** Carga asíncrona con estados de carga/error, recarga manual y reintento automático al despertar. */
export function useLoader<T>(loader: () => Promise<T>, key = ''): Loader<T> {
  const [state, setState] = useState<LoaderData<T>>({ data: undefined, error: null, loading: true, refreshing: false });
  const [version, setVersion] = useState(0);
  const retries = useRef(0);
  const load = useEffectEvent(loader);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    load().then(
      (data) => {
        if (!active) return;
        retries.current = 0;
        setState({ data, error: null, loading: false, refreshing: false });
      },
      (err: unknown) => {
        if (!active) return;
        const error = toApiError(err);
        setState((prev) => ({ ...prev, error, loading: false, refreshing: false }));
        if (error.waking && retries.current < MAX_AUTO_RETRIES) {
          retries.current += 1;
          timer = setTimeout(() => setVersion((v) => v + 1), AUTO_RETRY_MS);
        }
      },
    );
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [version, key]);

  const reload = useCallback(() => {
    retries.current = 0;
    setState((prev) => ({ ...prev, loading: true }));
    setVersion((v) => v + 1);
  }, []);
  const refresh = useCallback(() => {
    retries.current = 0;
    setState((prev) => ({ ...prev, refreshing: true }));
    setVersion((v) => v + 1);
  }, []);
  const revalidate = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, reload, refresh, revalidate };
}

/** Ejecuta `callback` cada `ms` milisegundos mientras `enabled` sea verdadero. */
export function useInterval(callback: () => void, ms: number, enabled = true): void {
  const tick = useEffectEvent(callback);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => tick(), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}

/** Ejecuta `callback` cada vez que la pantalla vuelve a estar a la vista (no la primera vez). */
export function useOnRefocus(callback: () => void): void {
  const focused = useIsFocused();
  const wasFocused = useRef(focused);
  const run = useEffectEvent(callback);
  useEffect(() => {
    if (focused && !wasFocused.current) run();
    wasFocused.current = focused;
  }, [focused]);
}

/** Hora actual que se actualiza cada `ms` (para no llamar a Date.now() durante el renderizado). */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useInterval(() => setNow(Date.now()), ms);
  return now;
}

/**
 * Acción con estado de ocupado y error. Si falla porque los servicios se están despertando,
 * `retry` repite la última acción (botón «Reintentar»).
 */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const last = useRef<(() => Promise<unknown>) | null>(null);

  const execute = useCallback(async <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
    setBusy(key);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(toApiError(err));
      return undefined;
    } finally {
      setBusy(null);
    }
  }, []);

  const run = useCallback(
    <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
      last.current = () => execute(key, action);
      return execute(key, action);
    },
    [execute],
  );

  const retry = useCallback(() => {
    void last.current?.();
  }, []);
  const dismiss = useCallback(() => setError(null), []);

  return { busy, error, run, retry, dismiss };
}
