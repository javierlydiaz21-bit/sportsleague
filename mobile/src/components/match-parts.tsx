import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { eventLabel, formatDateTime, playerName, STATUS_LABEL } from '@/lib/format';
import type { LiveStatus, MatchEvent, Player, Score, Sport, Team } from '@/lib/types';
import { TeamBadge } from './team-badge';
import { Badge, LiveBadge } from './ui';

export function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'GOAL') return <View style={[styles.goalDot]} />;
  if (type === 'YELLOW_CARD') return <View style={[styles.card, { backgroundColor: Colors.yellowCard }]} />;
  if (type === 'RED_CARD') return <View style={[styles.card, { backgroundColor: Colors.redCard }]} />;
  return <Ionicons name="swap-horizontal" size={16} color={Colors.info} />;
}

export function StatusBadge({ status }: { status: LiveStatus }) {
  if (status === 'LIVE') return <LiveBadge />;
  if (status === 'FINISHED') return <Badge>Finalizado</Badge>;
  if (status === 'SUSPENDED') return <Badge tone="amber">Suspendido</Badge>;
  return <Badge tone="blue">{STATUS_LABEL.SCHEDULED}</Badge>;
}

/** Marcador grande del partido, con espectadores conectados y estado de la conexión en vivo. */
export function Scoreboard({
  home,
  away,
  score,
  status,
  scheduledAt,
  venueName,
  viewers,
  connected,
  subtitle,
}: {
  home?: Team;
  away?: Team;
  score: Score;
  status: LiveStatus;
  scheduledAt: string;
  venueName?: string | null;
  viewers: number;
  connected: boolean;
  subtitle?: string;
}) {
  const showScore = status !== 'NOT_STARTED';
  return (
    <View style={styles.board}>
      <View style={styles.boardTop}>
        <Text style={styles.boardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <StatusBadge status={status} />
      </View>
      <View style={styles.boardTeams}>
        <View style={styles.boardTeam}>
          <TeamBadge name={home?.name ?? '?'} color={home?.color} size="lg" />
          <Text style={styles.boardTeamName} numberOfLines={2}>
            {home?.name ?? 'Local'}
          </Text>
        </View>
        <View style={styles.boardScore} accessible accessibilityLabel={showScore ? `Marcador ${score.home} a ${score.away}` : 'Sin comenzar'}>
          {showScore ? (
            <Text style={styles.scoreText} testID="marcador">
              {score.home}
              <Text style={styles.scoreSeparator}> : </Text>
              {score.away}
            </Text>
          ) : (
            <Text style={styles.vsText}>vs</Text>
          )}
        </View>
        <View style={styles.boardTeam}>
          <TeamBadge name={away?.name ?? '?'} color={away?.color} size="lg" />
          <Text style={styles.boardTeamName} numberOfLines={2}>
            {away?.name ?? 'Visitante'}
          </Text>
        </View>
      </View>
      <Text style={styles.boardMeta}>
        {formatDateTime(scheduledAt)}
        {venueName ? ` · ${venueName}` : ''}
      </Text>
      <View style={styles.boardLive}>
        <Ionicons name="eye-outline" size={15} color={Colors.muted} />
        <Text style={styles.boardMeta}>
          {viewers} {viewers === 1 ? 'espectador conectado' : 'espectadores conectados'}
        </Text>
        <View style={[styles.connDot, { backgroundColor: connected ? Colors.green : Colors.subtle }]} />
        <Text style={[styles.boardMeta, { color: connected ? Colors.green : Colors.subtle }]}>
          {connected ? 'En tiempo real' : 'Reconectando…'}
        </Text>
      </View>
    </View>
  );
}

/** Línea de tiempo del partido (el más reciente arriba). Con onDelete, cada evento se puede borrar. */
export function Timeline({
  events,
  homeTeamId,
  teams,
  players,
  sport,
  onDelete,
}: {
  events: MatchEvent[];
  homeTeamId: string;
  teams: Map<string, Team>;
  players: Map<string, Player>;
  sport: Sport;
  onDelete?: (event: MatchEvent) => void;
}) {
  if (events.length === 0) return <Text style={styles.timelineEmpty}>Aún no hay eventos registrados.</Text>;
  return (
    <View>
      {[...events].reverse().map((event, index) => {
        const isHome = event.teamId === homeTeamId;
        const player = event.playerId ? players.get(event.playerId) : undefined;
        const playerIn = event.playerInId ? players.get(event.playerInId) : undefined;
        const detail =
          event.type === 'SUBSTITUTION'
            ? `Sale ${playerName(player)} · entra ${playerName(playerIn)}`
            : player
              ? playerName(player)
              : 'Sin jugador';
        return (
          <View key={event.id} style={[styles.eventRow, index > 0 && styles.eventDivider]}>
            <Text style={styles.eventMinute}>{event.minute}&apos;</Text>
            <View style={styles.eventIcon}>
              <EventIcon type={event.type} />
            </View>
            <View style={styles.eventBody}>
              <Text style={styles.eventTitle}>
                {eventLabel(event.type, sport, event.value)}
                <Text style={styles.eventTeam}> · {teams.get(event.teamId)?.name ?? (isHome ? 'Local' : 'Visitante')}</Text>
              </Text>
              <Text style={styles.eventDetail} numberOfLines={2}>
                {detail}
              </Text>
            </View>
            {onDelete && (
              <Pressable
                onPress={() => onDelete(event)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Borrar ${eventLabel(event.type, sport, event.value)} del minuto ${event.minute}`}
                style={({ pressed }) => [styles.deleteButton, pressed && { backgroundColor: Colors.liveSoft }]}>
                <Ionicons name="trash-outline" size={18} color={Colors.live} />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function Lineup({ team, players }: { team?: Team; players: Player[] }) {
  return (
    <View style={styles.lineup}>
      <View style={styles.lineupHeader}>
        <TeamBadge name={team?.name ?? '?'} color={team?.color} size="sm" />
        <Text style={styles.lineupTitle} numberOfLines={1}>
          {team?.name ?? 'Equipo'}
        </Text>
      </View>
      {players.map((player) => (
        <View key={player.id} style={styles.lineupRow}>
          <Text style={styles.lineupNumber}>{player.jerseyNumber ?? '–'}</Text>
          <Text style={styles.lineupName}>{playerName(player)}</Text>
        </View>
      ))}
      {players.length === 0 && <Text style={styles.lineupEmpty}>Sin jugadores inscritos</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  goalDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.wine },
  card: { width: 10, height: 14, borderRadius: 2 },
  board: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  boardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  boardSubtitle: { flex: 1, fontSize: 12, color: Colors.muted },
  boardTeams: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl },
  boardTeam: { flex: 1, alignItems: 'center', gap: Spacing.sm },
  boardTeamName: { fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  boardScore: { paddingHorizontal: Spacing.sm, minWidth: 110, alignItems: 'center' },
  scoreText: { fontSize: 46, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
  scoreSeparator: { color: Colors.subtle, fontWeight: '400' },
  vsText: { fontSize: 28, color: Colors.subtle, fontWeight: '600' },
  boardMeta: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
  boardLive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  connDot: { width: 7, height: 7, borderRadius: 4, marginLeft: Spacing.sm },
  timelineEmpty: { textAlign: 'center', color: Colors.muted, fontSize: 14, paddingVertical: Spacing.xl },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  eventDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line },
  eventMinute: { width: 34, textAlign: 'center', fontSize: 13, fontWeight: '700', color: Colors.muted },
  eventIcon: { width: 18, alignItems: 'center' },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  eventTeam: { fontWeight: '400', color: Colors.muted },
  eventDetail: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  deleteButton: { padding: 8, borderRadius: Radius.sm },
  lineup: { flex: 1, gap: 6 },
  lineupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  lineupTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  lineupRow: { flexDirection: 'row', gap: Spacing.sm },
  lineupNumber: { width: 22, textAlign: 'right', fontSize: 12, color: Colors.subtle, fontVariant: ['tabular-nums'] },
  lineupName: { flex: 1, fontSize: 13, color: Colors.muted },
  lineupEmpty: { fontSize: 13, color: Colors.subtle },
});
