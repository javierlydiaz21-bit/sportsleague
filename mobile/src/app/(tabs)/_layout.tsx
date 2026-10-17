import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useRef } from 'react';
import type { ColorValue } from 'react-native';
import type { IconName } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Ionicons name={name} size={size} color={typeof color === 'string' ? color : Colors.subtle} />;
}

/**
 * Una sola app con dos modos:
 *  - Espectador (sin sesión, o con una cuenta que no es de árbitro): «En vivo» y «Próximos».
 *  - Árbitro: además, «Mis partidos» con sus asignaciones y el control de cada partido.
 */
export default function TabsLayout() {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isReferee = user?.role === 'REFEREE';

  // Al detectar una sesión de árbitro (al abrir la app o al iniciar sesión) se abre «Mis partidos»,
  // salvo que la app se haya abierto en otra pantalla (p. ej. con un enlace a un partido).
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isReferee || !user) {
      openedFor.current = null;
      return;
    }
    if (openedFor.current === user.id) return;
    openedFor.current = user.id;
    if (pathname === '/' || pathname === '/cuenta') router.navigate('/mis-partidos');
  }, [isReferee, user, router, pathname]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.wine },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: Colors.wine,
        tabBarInactiveTintColor: Colors.subtle,
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.line },
        sceneStyle: { backgroundColor: Colors.bg },
      }}>
      <Tabs.Protected guard={isReferee}>
        <Tabs.Screen
          name="mis-partidos"
          options={{ title: 'Mis partidos', tabBarIcon: (props) => <TabIcon name="clipboard-outline" {...props} /> }}
        />
      </Tabs.Protected>
      <Tabs.Screen name="index" options={{ title: 'En vivo', tabBarIcon: (props) => <TabIcon name="radio-outline" {...props} /> }} />
      <Tabs.Screen name="proximos" options={{ title: 'Próximos', tabBarIcon: (props) => <TabIcon name="calendar-outline" {...props} /> }} />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: status === 'authenticated' ? 'Cuenta' : 'Árbitros',
          headerTitle: status === 'authenticated' ? 'Mi cuenta' : 'Acceso para árbitros',
          tabBarIcon: (props) => (
            <TabIcon name={status === 'authenticated' ? 'person-circle-outline' : 'log-in-outline'} {...props} />
          ),
        }}
      />
    </Tabs>
  );
}
