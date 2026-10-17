import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { wakeServices } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  // Al abrir la app se hace GET /health al gateway: en Render Free despierta a los servicios dormidos.
  useEffect(() => {
    wakeServices();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.wine },
              headerTintColor: Colors.white,
              headerTitleStyle: { fontWeight: '700' },
              headerBackTitle: 'Volver',
              contentStyle: { backgroundColor: Colors.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Inicio' }} />
            <Stack.Screen name="partido/[id]" options={{ title: 'Partido' }} />
            <Stack.Screen name="arbitro/[id]" options={{ title: 'Control del partido' }} />
          </Stack>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
