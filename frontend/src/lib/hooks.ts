'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from './format';

/** Carga asíncrona con estado de carga/error y recarga manual. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

/** Ejecuta una acción mostrando éxito/error y devolviendo su resultado. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <T,>(key: string, action: () => Promise<T>, onError?: (message: string) => void): Promise<T | undefined> => {
    setBusy(key);
    try {
      return await action();
    } catch (err) {
      onError?.(errorMessage(err));
      return undefined;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, run };
}

export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
