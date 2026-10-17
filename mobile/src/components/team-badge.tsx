import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { initials } from '@/lib/format';

/** Texto blanco u oscuro según el brillo del color del equipo. */
function textOn(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return Colors.white;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? Colors.text : Colors.white;
}

const SIZES = { sm: 28, md: 40, lg: 64 } as const;

export function TeamBadge({ name, color, size = 'md' }: { name: string; color?: string | null; size?: keyof typeof SIZES }) {
  const dimension = SIZES[size];
  const background = color && /^#?[0-9a-f]{6}$/i.test(color) ? (color.startsWith('#') ? color : `#${color}`) : Colors.wine;
  return (
    <View
      style={[styles.badge, { width: dimension, height: dimension, borderRadius: dimension / 2, backgroundColor: background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={{ color: textOn(background), fontSize: dimension * 0.36, fontWeight: '700' }}>{initials(name) || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
});
