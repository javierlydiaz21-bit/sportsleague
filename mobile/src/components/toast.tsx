import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '@/constants/theme';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' } as const;
const BACKGROUNDS = { success: Colors.green, error: Colors.live, info: Colors.text } as const;

/** Mensajes breves de confirmación (equivalente a los toasts de la web). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((kind: ToastKind, message: string) => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[styles.wrap, { top: insets.top + Spacing.sm }]}>
          <View style={[styles.toast, { backgroundColor: BACKGROUNDS[toast.kind] }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Ionicons name={ICONS[toast.kind]} size={18} color={Colors.white} />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    maxWidth: 560,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flexShrink: 1, color: Colors.white, fontSize: 14, fontWeight: '600' },
});
