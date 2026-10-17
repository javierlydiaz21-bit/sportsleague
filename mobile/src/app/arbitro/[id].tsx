import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorNotice } from '@/components/error-notice';
import { EventIcon, Scoreboard, Timeline } from '@/components/match-parts';
import { Sheet } from '@/components/sheet';
import { TeamBadge } from '@/components/team-badge';
import { useToast } from '@/components/toast';
import { Button, Card, Content, Loading, Notice, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { byId, withEvent, withoutEvent } from '@/lib/compose';
import { elapsedMinute, eventLabel, playerName } from '@/lib/format';
import { useAction, useLoader, useNow } from '@/lib/hooks';
import { useLiveMatch } from '@/lib/live';
import { loadMatchData, type MatchData } from '@/lib/match-data';
import type { EventType, LiveSnapshot, MatchEvent, Player, Score, Team } from '@/lib/types';

/** Control del partido para el árbitro asignado (como frontend/src/components/match/match-control.tsx). */
export default function ControlScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user, status } = useAuth();
  const router = useRouter();
  const isReferee = user?.role === 'REFEREE';
  const state = useLoader(() => (isReferee ? loadMatchData(api, id, true) : Promise.resolve(null)), `${id}:${isReferee}`);

  if (status === 'loading') return <Loading />;
  if (!isReferee) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Content style={styles.stack}>
          <Notice tone="amber" icon="lock-closed-outline" title="Solo para árbitros">
            {user
              ? 'El control de partidos de la app es para el árbitro asignado. Con tu cuenta puedes seguir el partido como espectador.'
              : 'Inicia sesión con tu cuenta de árbitro para controlar este partido.'}
          </Notice>
          <Button title="Ver como espectador" icon="eye-outline" variant="secondary" onPress={() => router.replace(`/partido/${id}`)} />
          {!user && <Button title="Iniciar sesión" icon="log-in-outline" onPress={() => router.navigate('/cuenta')} />}
        </Content>
      </ScrollView>
    );
  }
  if (state.data) return <ControlPanel data={state.data} />;
  if (state.error) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Content>
          <ErrorNotice error={state.error} onRetry={state.reload} retrying={state.loading} title="No pudimos cargar el partido" />
        </Content>
      </ScrollView>
    );
  }
  return <Loading label="Cargando el partido…" />;
}

interface Draft {
  type: EventType;
  teamId: string;
  value: number;
  minute: number;
  playerId: string;
  playerInId: string;
}

const clampMinute = (value: number) => Math.min(200, Math.max(0, Number.isFinite(value) ? Math.round(value) : 0));

function ControlPanel({ data }: { data: MatchData }) {
  const { api } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { match, teams, players, league } = data;
  const { snapshot, setSnapshot, connected } = useLiveMatch(match.id, data.snapshot, () =>
    api.get<LiveSnapshot>(`/matches/${match.id}/live`),
  );
  const sport = league?.sport ?? 'FOOTBALL';
  const teamMap = useMemo(() => byId(teams), [teams]);
  const playerMap = useMemo(() => byId(players), [players]);
  const home = teamMap.get(match.homeTeamId);
  const away = teamMap.get(match.awayTeamId);
  const venue = league?.venues?.find((v) => v.id === match.venueId);

  // El reloj avanza solo mientras el partido está en curso; se puede ajustar a mano.
  const now = useNow(15_000);
  const [manualMinute, setManualMinute] = useState<number | null>(null);
  const minute = manualMinute ?? elapsedMinute(snapshot.startedAt, now);

  const action = useAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<MatchEvent | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [attendance, setAttendance] = useState('');
  const [notes, setNotes] = useState('');

  const canEdit = snapshot.status === 'LIVE';
  const scoreValues = sport === 'BASKETBALL' ? [1, 2, 3] : [1];
  const scoreIcon: IconName =
    sport === 'BASKETBALL' ? 'basketball-outline' : sport === 'VOLLEYBALL' ? 'tennisball-outline' : 'football-outline';

  /** POST /matches/:id/start */
  const start = async () => {
    const result = await action.run('start', () => api.post<LiveSnapshot>(`/matches/${match.id}/start`));
    if (result) {
      setSnapshot(result);
      toast.success('Partido iniciado: los espectadores ya lo ven en vivo');
    }
  };

  const openDraft = (type: EventType, teamId: string, value = 1) => {
    action.dismiss();
    setDraft({ type, teamId, value, minute, playerId: '', playerInId: '' });
  };

  /** POST /matches/:id/events { type, teamId, minute, playerId?, playerInId?, value? } */
  const submitEvent = async () => {
    if (!draft) return;
    const body = {
      type: draft.type,
      teamId: draft.teamId,
      minute: draft.minute,
      ...(draft.type === 'GOAL' && draft.value > 1 ? { value: draft.value } : {}),
      ...(draft.playerId ? { playerId: draft.playerId } : {}),
      ...(draft.type === 'SUBSTITUTION' && draft.playerInId ? { playerInId: draft.playerInId } : {}),
    };
    const result = await action.run('event', () =>
      api.post<{ event: MatchEvent; score: Score }>(`/matches/${match.id}/events`, body),
    );
    if (result) {
      // El WebSocket también lo difunde; se aplica ya por si la conexión en vivo está caída.
      setSnapshot((prev) => withEvent(prev, result.event, result.score));
      toast.success(`Registrado: ${eventLabel(draft.type, sport, draft.value)}, minuto ${draft.minute}`);
      setDraft(null);
    }
  };

  /** DELETE /matches/:id/events/:eventId */
  const removeEvent = async () => {
    if (!deleting) return;
    const event = deleting;
    const result = await action.run('delete', () =>
      api.del<{ ok: boolean; score: Score }>(`/matches/${match.id}/events/${event.id}`),
    );
    if (result) {
      setSnapshot((prev) => withoutEvent(prev, event.id, result.score));
      toast.info('Evento eliminado');
      setDeleting(null);
    }
  };

  /** POST /matches/:id/complete { attendance?, notes? } */
  const finish = async () => {
    const body = {
      ...(attendance ? { attendance: Number(attendance) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const result = await action.run('finish', () => api.post<LiveSnapshot>(`/matches/${match.id}/complete`, body));
    if (result) {
      setSnapshot(result);
      setFinishing(false);
      toast.success('Acta cerrada: se publicó el resultado y la tabla se recalcula');
    }
  };

  const draftTeam = draft ? teamMap.get(draft.teamId) : undefined;
  const roster = draft
    ? players
        .filter((p) => p.teamId === draft.teamId)
        .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) || a.lastName.localeCompare(b.lastName))
    : [];
  const errorBox = action.error ? <ErrorNotice error={action.error} onRetry={action.retry} retrying={!!action.busy} /> : null;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Content style={styles.stack}>
        <View style={styles.topRow}>
          <Text style={styles.league} numberOfLines={1}>
            {league?.name ?? ''}
          </Text>
          <Pressable onPress={() => router.push(`/partido/${match.id}`)} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>Ver como espectador →</Text>
          </Pressable>
        </View>

        <Scoreboard
          home={home}
          away={away}
          score={snapshot.score}
          status={snapshot.status}
          scheduledAt={match.scheduledAt}
          venueName={venue?.name}
          viewers={snapshot.viewers}
          connected={connected}
          subtitle={`Control del partido · Jornada ${match.round}`}
        />

        {!draft && !deleting && !finishing && errorBox}

        {match.status === 'SUSPENDED' && (
          <Notice tone="amber" icon="pause-circle-outline" title="Partido suspendido">
            {match.suspensionReason ?? ''}
          </Notice>
        )}

        {snapshot.status === 'NOT_STARTED' && match.status !== 'SUSPENDED' && (
          <View style={styles.startBox}>
            <Button title="Iniciar partido" icon="play" size="lg" onPress={() => void start()} loading={action.busy === 'start'} style={styles.startButton} />
            <Text style={styles.hint}>Al iniciar, el marcador queda en vivo para todos los espectadores.</Text>
          </View>
        )}

        {snapshot.status === 'LIVE' && (
          <Card style={styles.controls}>
            <View style={styles.minuteRow}>
              <Text style={styles.minuteLabel}>Minuto</Text>
              <MinuteStepper value={minute} onChange={(value) => setManualMinute(clampMinute(value))} />
            </View>
            {manualMinute !== null && (
              <Pressable onPress={() => setManualMinute(null)} accessibilityRole="button" style={styles.autoClock}>
                <Ionicons name="time-outline" size={14} color={Colors.wine} />
                <Text style={styles.link}>Volver al reloj automático</Text>
              </Pressable>
            )}
            {[home, away].map((team, index) => (
              <TeamControls
                key={team?.id ?? index}
                team={team}
                fallbackName={index === 0 ? 'Local' : 'Visitante'}
                scoreValues={scoreValues}
                scoreLabel={(value) => eventLabel('GOAL', sport, value)}
                scoreIcon={scoreIcon}
                onEvent={(type, value) => openDraft(type, team?.id ?? (index === 0 ? match.homeTeamId : match.awayTeamId), value)}
              />
            ))}
            <Button
              title="Finalizar partido"
              icon="stop"
              variant="danger"
              onPress={() => {
                action.dismiss();
                setFinishing(true);
              }}
            />
          </Card>
        )}

        {snapshot.status === 'FINISHED' && (
          <Notice tone="green" icon="checkmark-done-outline" title={`Partido finalizado · acta versión ${snapshot.version}`}>
            El acta quedó cerrada. Solo el organizador puede corregirla desde la web.
          </Notice>
        )}

        <Card>
          <Text style={styles.cardTitle}>Acta del partido</Text>
          <Timeline
            events={snapshot.events}
            homeTeamId={match.homeTeamId}
            teams={teamMap}
            players={playerMap}
            sport={sport}
            onDelete={
              canEdit
                ? (event) => {
                    action.dismiss();
                    setDeleting(event);
                  }
                : undefined
            }
          />
        </Card>
      </Content>

      {/* Registro de un evento: equipo (botón pulsado), jugador y minuto. */}
      <Sheet
        visible={!!draft}
        onClose={() => setDraft(null)}
        title={draft ? `${eventLabel(draft.type, sport, draft.value)} · ${draftTeam?.name ?? ''}` : ''}
        footer={
          <>
            <Button title="Cancelar" variant="secondary" style={styles.flex} onPress={() => setDraft(null)} />
            <Button
              title="Registrar"
              style={styles.flex}
              onPress={() => void submitEvent()}
              loading={action.busy === 'event'}
              disabled={draft?.type === 'SUBSTITUTION' && (!draft.playerId || !draft.playerInId)}
            />
          </>
        }>
        {draft && (
          <>
            {errorBox}
            <View style={styles.minuteRow}>
              <Text style={styles.minuteLabel}>Minuto</Text>
              <MinuteStepper value={draft.minute} onChange={(value) => setDraft({ ...draft, minute: clampMinute(value) })} />
            </View>
            <PlayerPicker
              label={draft.type === 'SUBSTITUTION' ? 'Sale' : 'Jugador'}
              players={roster}
              selected={draft.playerId}
              optional={draft.type !== 'SUBSTITUTION'}
              onSelect={(playerId) =>
                setDraft({ ...draft, playerId, playerInId: draft.playerInId === playerId ? '' : draft.playerInId })
              }
            />
            {draft.type === 'SUBSTITUTION' && (
              <PlayerPicker
                label="Entra"
                players={roster.filter((p) => p.id !== draft.playerId)}
                selected={draft.playerInId}
                onSelect={(playerInId) => setDraft({ ...draft, playerInId })}
              />
            )}
          </>
        )}
      </Sheet>

      <Sheet
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="¿Borrar este evento?"
        description={deleting ? `«${eventLabel(deleting.type, sport, deleting.value)}» del minuto ${deleting.minute}. El marcador se recalcula para todos.` : ''}
        footer={
          <>
            <Button title="Cancelar" variant="secondary" style={styles.flex} onPress={() => setDeleting(null)} />
            <Button title="Borrar" icon="trash-outline" variant="danger" style={styles.flex} onPress={() => void removeEvent()} loading={action.busy === 'delete'} />
          </>
        }>
        {errorBox}
      </Sheet>

      <Sheet
        visible={finishing}
        onClose={() => setFinishing(false)}
        title="Finalizar partido"
        description={`Resultado final: ${home?.name ?? 'Local'} ${snapshot.score.home} - ${snapshot.score.away} ${away?.name ?? 'Visitante'}`}
        footer={
          <>
            <Button title="Cancelar" variant="secondary" style={styles.flex} onPress={() => setFinishing(false)} />
            <Button title="Cerrar acta" style={styles.flex} onPress={() => void finish()} loading={action.busy === 'finish'} />
          </>
        }>
        {errorBox}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Asistencia (opcional)</Text>
          <TextInput
            style={styles.input}
            value={attendance}
            onChangeText={(text) => setAttendance(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="Número de asistentes"
            placeholderTextColor={Colors.subtle}
            accessibilityLabel="Asistencia"
          />
          <Text style={styles.fieldHint}>Si no la reportas, Analytics usa el pico de espectadores conectados.</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Observaciones (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            placeholder="Incidencias del partido"
            placeholderTextColor={Colors.subtle}
            accessibilityLabel="Observaciones"
          />
        </View>
      </Sheet>
    </ScrollView>
  );
}

function TeamControls({
  team,
  fallbackName,
  scoreValues,
  scoreLabel,
  scoreIcon,
  onEvent,
}: {
  team?: Team;
  fallbackName: string;
  scoreValues: number[];
  scoreLabel: (value: number) => string;
  scoreIcon: IconName;
  onEvent: (type: EventType, value?: number) => void;
}) {
  const name = team?.name ?? fallbackName;
  return (
    <View style={styles.team}>
      <View style={styles.teamHeader}>
        <TeamBadge name={name} color={team?.color} size="sm" />
        <Text style={styles.teamName} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.grid}>
        {scoreValues.map((value) => (
          <Button
            key={value}
            title={scoreLabel(value)}
            icon={scoreIcon}
            onPress={() => onEvent('GOAL', value)}
            style={styles.gridItem}
            accessibilityLabel={`${scoreLabel(value)} de ${name}`}
          />
        ))}
        <Button
          title="Amarilla"
          variant="secondary"
          iconNode={<EventIcon type="YELLOW_CARD" />}
          onPress={() => onEvent('YELLOW_CARD')}
          style={styles.gridItem}
          accessibilityLabel={`Tarjeta amarilla a ${name}`}
        />
        <Button
          title="Roja"
          variant="secondary"
          iconNode={<EventIcon type="RED_CARD" />}
          onPress={() => onEvent('RED_CARD')}
          style={styles.gridItem}
          accessibilityLabel={`Tarjeta roja a ${name}`}
        />
        <Button
          title="Sustitución"
          variant="secondary"
          icon="swap-horizontal"
          onPress={() => onEvent('SUBSTITUTION')}
          style={styles.gridItem}
          accessibilityLabel={`Sustitución de ${name}`}
        />
      </View>
    </View>
  );
}

function MinuteStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(value - 1)} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="Restar un minuto">
        <Ionicons name="remove" size={20} color={Colors.text} />
      </Pressable>
      <TextInput
        style={styles.stepInput}
        value={String(value)}
        onChangeText={(text) => onChange(Number(text.replace(/\D/g, '') || 0))}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
        accessibilityLabel="Minuto del partido"
      />
      <Pressable onPress={() => onChange(value + 1)} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="Sumar un minuto">
        <Ionicons name="add" size={20} color={Colors.text} />
      </Pressable>
    </View>
  );
}

function PlayerPicker({
  label,
  players,
  selected,
  optional,
  onSelect,
}: {
  label: string;
  players: Player[];
  selected: string;
  optional?: boolean;
  onSelect: (playerId: string) => void;
}) {
  const options = [...(optional ? [{ id: '', text: 'Sin especificar' }] : []), ...players.map((p) => ({ id: p.id, text: `${p.jerseyNumber ?? '–'} · ${playerName(p)}` }))];
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {players.length === 0 && <Text style={styles.fieldHint}>Este equipo no tiene jugadores inscritos.</Text>}
      <View style={styles.options}>
        {options.map((option) => {
          const active = option.id === selected;
          return (
            <Pressable
              key={option.id || 'none'}
              onPress={() => onSelect(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.option, active && styles.optionActive]}>
              <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={active ? Colors.wine : Colors.subtle} />
              <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                {option.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  stack: { gap: Spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  league: { flex: 1, fontSize: 13, color: Colors.muted },
  link: { fontSize: 13, color: Colors.wine, fontWeight: '600' },
  startBox: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  startButton: { alignSelf: 'stretch' },
  hint: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
  controls: { gap: Spacing.lg },
  minuteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  minuteLabel: { fontSize: 14, color: Colors.muted },
  autoClock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: -Spacing.sm },
  team: { gap: Spacing.sm },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  teamName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridItem: { flexGrow: 1, flexBasis: '45%' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  stepInput: {
    width: 64,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  fieldHint: { fontSize: 12, color: Colors.muted },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  textarea: { minHeight: 90, paddingTop: Spacing.md, textAlignVertical: 'top' },
  options: { gap: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  optionActive: { borderColor: Colors.wine, backgroundColor: Colors.wineSoft },
  optionText: { flex: 1, fontSize: 14, color: Colors.text },
  optionTextActive: { color: Colors.wine, fontWeight: '600' },
});
