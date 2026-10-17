import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorNotice } from '@/components/error-notice';
import { Sheet } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Content, EmptyState, LiveBadge, Loading, Notice, SectionTitle } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useAction, useLoader, useNow, useOnRefocus } from '@/lib/hooks';
import type { Assignment, RefereeProfile } from '@/lib/types';

const STATUS = {
  ASSIGNED: { label: 'Por confirmar', tone: 'amber' },
  CONFIRMED: { label: 'Confirmado', tone: 'green' },
  DECLINED: { label: 'Rechazado', tone: 'red' },
} as const;

/** Asignaciones del árbitro: GET /assignments/mine y GET /referees/me (como el panel de árbitro de la web). */
export default function MyMatchesScreen() {
  const { api, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(60_000);
  const action = useAction();
  const [declining, setDeclining] = useState<Assignment | null>(null);

  const state = useLoader(async () => {
    const [assignments, profiles] = await Promise.all([
      api.get<Assignment[]>('/assignments/mine'),
      api.get<RefereeProfile[]>('/referees/me'),
    ]);
    return { assignments, profiles };
  }, user?.id);

  // Al volver del control de un partido, se actualizan los estados.
  useOnRefocus(state.revalidate);

  /** PUT /assignments/:id/confirm { confirmed }: confirmar o rechazar (el sistema busca otro árbitro). */
  const respond = async (assignment: Assignment, confirmed: boolean) => {
    const result = await action.run(`${assignment.id}:${confirmed}`, () =>
      api.put<Assignment>(`/assignments/${assignment.id}/confirm`, { confirmed }),
    );
    setDeclining(null);
    if (result) {
      state.revalidate();
      toast.success(confirmed ? 'Partido confirmado' : 'Partido rechazado: el sistema buscará otro árbitro');
    }
  };

  if (state.loading && !state.data && !state.error) return <Loading label="Cargando tus partidos…" />;

  const assignments = state.data?.assignments ?? [];
  const upcoming = assignments.filter(
    (a) => new Date(a.scheduledAt).getTime() > now - 3 * 3600_000 && a.match?.status !== 'FINISHED',
  );
  const past = assignments.filter((a) => !upcoming.includes(a)).reverse();

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} colors={[Colors.wine]} tintColor={Colors.wine} />}>
      <Content style={styles.stack}>
        {state.error && <ErrorNotice error={state.error} onRetry={state.reload} retrying={state.loading} />}
        {action.error && <ErrorNotice error={action.error} onRetry={action.retry} retrying={!!action.busy} />}
        {state.data?.profiles.length === 0 && (
          <Notice tone="amber" icon="information-circle-outline" title="Aún no estás registrado como árbitro en ninguna liga">
            {`Pide al organizador que te registre con el correo ${user?.email ?? ''}. Tus asignaciones aparecerán aquí.`}
          </Notice>
        )}

        {state.data && (
          <View>
            <SectionTitle title="Próximos" />
            {upcoming.length === 0 ? (
              <Card>
                <EmptyState icon="calendar-outline" title="No tienes partidos próximos" />
              </Card>
            ) : (
              <View style={styles.list}>
                {upcoming.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    busy={action.busy}
                    onConfirm={() => void respond(assignment, true)}
                    onDecline={() => setDeclining(assignment)}
                    onControl={() => router.push(`/arbitro/${assignment.matchId}`)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {past.length > 0 && (
          <View>
            <SectionTitle title="Anteriores" />
            <Card style={styles.pastCard}>
              {past.map((assignment, index) => (
                <Pressable
                  key={assignment.id}
                  onPress={() => router.push(`/partido/${assignment.matchId}`)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.pastRow, index > 0 && styles.divider, pressed && styles.pressed]}>
                  <View style={styles.flex}>
                    <Text style={styles.pastLabel} numberOfLines={1}>
                      {assignment.match?.label ?? 'Partido'}
                    </Text>
                    <Text style={styles.meta}>{formatDateTime(assignment.scheduledAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.subtle} />
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      </Content>

      <Sheet
        visible={!!declining}
        onClose={() => setDeclining(null)}
        title="¿Rechazar este partido?"
        description={`${declining?.match?.label ?? 'Partido'} · el sistema buscará otro árbitro disponible.`}
        footer={
          <>
            <Button title="Cancelar" variant="secondary" style={styles.flex} onPress={() => setDeclining(null)} />
            <Button
              title="Rechazar"
              variant="danger"
              style={styles.flex}
              loading={!!declining && action.busy === `${declining.id}:false`}
              onPress={() => declining && void respond(declining, false)}
            />
          </>
        }
      />
    </ScrollView>
  );
}

function AssignmentCard({
  assignment,
  busy,
  onConfirm,
  onDecline,
  onControl,
}: {
  assignment: Assignment;
  busy: string | null;
  onConfirm: () => void;
  onDecline: () => void;
  onControl: () => void;
}) {
  const status = STATUS[assignment.status];
  const match = assignment.match;
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.label}>{match?.label ?? 'Partido'}</Text>
        <View style={styles.badges}>
          <Badge tone={status.tone}>{status.label}</Badge>
          {match?.status === 'SUSPENDED' && <Badge tone="amber">Suspendido</Badge>}
          {match?.status === 'LIVE' && <LiveBadge />}
        </View>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={14} color={Colors.muted} />
        <Text style={styles.meta}>{formatDateTime(assignment.scheduledAt)}</Text>
      </View>
      {match?.venueName ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={Colors.muted} />
          <Text style={styles.meta}>{match.venueName}</Text>
        </View>
      ) : null}
      {match?.leagueName ? (
        <View style={styles.metaRow}>
          <Ionicons name="trophy-outline" size={14} color={Colors.muted} />
          <Text style={styles.meta}>
            {match.leagueName} · Jornada {match.round}
          </Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        {assignment.status === 'ASSIGNED' && (
          <>
            <Button
              title="Confirmar"
              icon="checkmark"
              variant="success"
              size="sm"
              loading={busy === `${assignment.id}:true`}
              onPress={onConfirm}
            />
            <Button title="Rechazar" variant="ghost" size="sm" onPress={onDecline} />
          </>
        )}
        {assignment.status !== 'DECLINED' && (
          <Button title="Control en vivo" icon="radio-outline" size="sm" onPress={onControl} style={styles.control} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  stack: { gap: Spacing.xl },
  list: { gap: Spacing.md },
  card: { gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: 4 },
  label: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  badges: { alignItems: 'flex-end', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: Colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  control: { marginLeft: 'auto' },
  pastCard: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden', borderRadius: Radius.lg },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  pastLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line },
  pressed: { backgroundColor: Colors.bg },
});
