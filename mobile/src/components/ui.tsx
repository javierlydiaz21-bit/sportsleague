import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: Colors.wine, fg: Colors.white, border: Colors.wine },
  secondary: { bg: Colors.card, fg: Colors.text, border: Colors.lineStrong },
  ghost: { bg: 'transparent', fg: Colors.muted, border: 'transparent' },
  danger: { bg: Colors.live, fg: Colors.white, border: Colors.live },
  success: { bg: Colors.green, fg: Colors.white, border: Colors.green },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconNode,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  /** Icono personalizado (p. ej. el rectángulo de una tarjeta). */
  iconNode?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = BUTTON_COLORS[variant];
  const inactive = disabled || loading;
  const height = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: colors.bg, borderColor: colors.border, paddingHorizontal: size === 'sm' ? 12 : 16 },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : (
        (iconNode ?? (icon ? <Ionicons name={icon} size={fontSize + 3} color={colors.fg} /> : null))
      )}
      <Text style={[styles.buttonText, { color: colors.fg, fontSize }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type Tone = 'neutral' | 'wine' | 'green' | 'amber' | 'red' | 'blue';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '#f1eeec', fg: Colors.muted },
  wine: { bg: Colors.wineSoft, fg: Colors.wine },
  green: { bg: Colors.greenSoft, fg: Colors.green },
  amber: { bg: Colors.amberSoft, fg: Colors.amber },
  red: { bg: Colors.liveSoft, fg: Colors.live },
  blue: { bg: Colors.infoSoft, fg: Colors.info },
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const colors = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.fg }]}>{children}</Text>
    </View>
  );
}

export function LiveBadge() {
  return (
    <View style={[styles.badge, { backgroundColor: Colors.liveSoft }]}>
      <View style={styles.liveDot} />
      <Text style={[styles.badgeText, { color: Colors.live }]}>En vivo</Text>
    </View>
  );
}

export function Notice({
  title,
  children,
  tone = 'amber',
  icon,
  action,
}: {
  title?: string;
  children?: ReactNode;
  tone?: Tone;
  icon?: IconName;
  action?: ReactNode;
}) {
  const colors = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: colors.bg, borderColor: colors.bg }]}>
      <View style={styles.noticeRow}>
        {icon && <Ionicons name={icon} size={18} color={colors.fg} style={styles.noticeIcon} />}
        <View style={styles.flex}>
          {title && <Text style={[styles.noticeTitle, { color: colors.fg }]}>{title}</Text>}
          {typeof children === 'string' ? <Text style={styles.noticeText}>{children}</Text> : children}
        </View>
      </View>
      {action && <View style={styles.noticeAction}>{action}</View>}
    </View>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      {icon && <Ionicons name={icon} size={36} color={Colors.subtle} />}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyText}>{description}</Text>}
    </View>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.wine} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, style }: { title: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionTitle, style]}>{title}</Text>;
}

/** Contenedor centrado con ancho máximo (tabletas y web). */
export function Content({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  buttonText: { fontWeight: '600' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    padding: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.live },
  notice: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  noticeRow: { flexDirection: 'row', gap: Spacing.sm },
  noticeIcon: { marginTop: 1 },
  noticeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  noticeText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  noticeAction: { marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  loadingText: { color: Colors.muted, fontSize: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});
