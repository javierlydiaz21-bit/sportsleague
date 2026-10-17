import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/format';
import { Button } from './ui';

/**
 * Sesión de alguien que no es árbitro (organizador, aficionado o administrador): ve el modo
 * espectador con su nombre y la opción de cerrar sesión.
 */
export function SessionBar() {
  const { user, logout } = useAuth();
  if (!user || user.role === 'REFEREE') return null;
  return (
    <View style={styles.bar} testID="barra-sesion">
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {ROLE_LABEL[user.role]} · modo espectador
        </Text>
      </View>
      <Button title="Cerrar sesión" icon="log-out-outline" size="sm" variant="secondary" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.wineSoft,
    borderColor: Colors.wineLine,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.wine },
  role: { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
