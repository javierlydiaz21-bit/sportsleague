import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorNotice } from '@/components/error-notice';
import { TeamBadge } from '@/components/team-badge';
import { Button, Card, Content, Notice } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { toApiError, type ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { ROLE_LABEL } from '@/lib/format';

export default function AccountScreen() {
  const { user, status } = useAuth();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Content style={styles.stack}>{status === 'authenticated' && user ? <Profile /> : <LoginForm />}</Content>
        <Text style={styles.server}>Servidor: {API_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** POST /auth/login con client: 'mobile' (el refresh token llega en el cuerpo). */
function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(toApiError(new Error('Escribe tu correo y tu contraseña.')));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      setPassword('');
      // El árbitro va a «Mis partidos» (lo hace el layout de pestañas); el resto, al modo espectador.
      if (user.role !== 'REFEREE') router.navigate('/');
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.intro}>
        <Text style={styles.title}>App de árbitros</Text>
        <Text style={styles.text}>
          Inicia sesión para ver tus partidos asignados, confirmarlos y registrar en vivo goles, tarjetas y sustituciones.
        </Text>
        <Text style={styles.text}>Para seguir los partidos como espectador no necesitas cuenta.</Text>
      </View>
      <Card style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="arbitro@correo.com"
            placeholderTextColor={Colors.subtle}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            accessibilityLabel="Correo electrónico"
            testID="login-email"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            placeholderTextColor={Colors.subtle}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            accessibilityLabel="Contraseña"
            testID="login-password"
          />
        </View>
        {error && (
          <ErrorNotice
            error={error}
            title="No se pudo iniciar sesión"
            onRetry={error.waking ? () => void submit() : undefined}
            retrying={busy}
          />
        )}
        <Button title="Iniciar sesión" icon="log-in-outline" size="lg" onPress={() => void submit()} loading={busy} />
      </Card>
    </>
  );
}

function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  const isReferee = user.role === 'REFEREE';
  return (
    <>
      <Card style={styles.profile}>
        <TeamBadge name={user.name} size="lg" />
        <View style={styles.flex}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>{ROLE_LABEL[user.role]}</Text>
        </View>
      </Card>
      {isReferee ? (
        <Notice tone="green" icon="checkmark-circle-outline" title="Modo árbitro">
          En «Mis partidos» tienes tus asignaciones y el control en vivo de cada partido.
        </Notice>
      ) : (
        <Notice tone="blue" icon="eye-outline" title="Modo espectador">
          {`El control de partidos de la app es para árbitros. Con tu cuenta de ${ROLE_LABEL[user.role].toLowerCase()} puedes seguir los partidos en «En vivo» y «Próximos»; el resto de la gestión está en la web.`}
        </Notice>
      )}
      {isReferee && (
        <Button title="Ir a Mis partidos" icon="clipboard-outline" variant="secondary" onPress={() => router.navigate('/mis-partidos')} />
      )}
      <Button title="Cerrar sesión" icon="log-out-outline" variant="secondary" onPress={() => void logout()} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  stack: { gap: Spacing.lg },
  intro: { gap: Spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: Colors.wine },
  text: { fontSize: 15, color: Colors.muted, lineHeight: 21 },
  form: { gap: Spacing.lg },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  name: { fontSize: 18, fontWeight: '700', color: Colors.text },
  email: { fontSize: 14, color: Colors.muted, marginTop: 2 },
  role: { fontSize: 13, color: Colors.wine, fontWeight: '600', marginTop: 4 },
  server: { fontSize: 11, color: Colors.subtle, textAlign: 'center' },
});
