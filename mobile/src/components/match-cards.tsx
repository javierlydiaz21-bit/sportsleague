import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/format';
import type { Score, Team } from '@/lib/types';
import { TeamBadge } from './team-badge';
import { LiveBadge } from './ui';

function TeamLine({ team, score }: { team?: Team; score?: number }) {
  return (
    <View style={styles.teamLine}>
      <TeamBadge name={team?.name ?? '?'} color={team?.color} size="sm" />
      <Text style={styles.teamName} numberOfLines={1}>
        {team?.name ?? 'Equipo'}
      </Text>
      {score !== undefined && <Text style={styles.score}>{score}</Text>}
    </View>
  );
}

/** Tarjeta de un partido en curso (pestaña «En vivo»). */
export function LiveMatchCard({
  leagueName,
  home,
  away,
  score,
  onPress,
}: {
  leagueName?: string;
  home?: Team;
  away?: Team;
  score: Score;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${home?.name ?? 'Local'} ${score.home}, ${away?.name ?? 'Visitante'} ${score.away}. Ver partido`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.league} numberOfLines={1}>
          {leagueName ?? 'Liga'}
        </Text>
        <LiveBadge />
      </View>
      <View style={styles.lines}>
        <TeamLine team={home} score={score.home} />
        <TeamLine team={away} score={score.away} />
      </View>
    </Pressable>
  );
}

/** Fila de un partido programado (pestaña «Próximos»). */
export function UpcomingMatchCard({
  leagueName,
  round,
  scheduledAt,
  home,
  away,
  venueName,
  onPress,
}: {
  leagueName?: string;
  round: number;
  scheduledAt: string;
  home?: Team;
  away?: Team;
  venueName?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${home?.name ?? 'Local'} contra ${away?.name ?? 'Visitante'}, ${formatTime(scheduledAt)}. Ver partido`}
      style={({ pressed }) => [styles.card, styles.upcoming, pressed && styles.pressed]}>
      <View style={styles.time}>
        <Text style={styles.timeText}>{formatTime(scheduledAt)}</Text>
      </View>
      <View style={styles.upcomingBody}>
        <Text style={styles.league} numberOfLines={1}>
          {leagueName ?? 'Liga'} · Jornada {round}
        </Text>
        <View style={styles.lines}>
          <TeamLine team={home} />
          <TeamLine team={away} />
        </View>
        {venueName ? (
          <View style={styles.venue}>
            <Ionicons name="location-outline" size={13} color={Colors.subtle} />
            <Text style={styles.venueText} numberOfLines={1}>
              {venueName}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    padding: Spacing.lg,
  },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  league: { flexShrink: 1, fontSize: 12, color: Colors.muted },
  lines: { marginTop: Spacing.md, gap: Spacing.sm },
  teamLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  teamName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  score: { fontSize: 22, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  time: {
    backgroundColor: Colors.wineSoft,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  timeText: { color: Colors.wine, fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'] },
  upcomingBody: { flex: 1 },
  venue: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  venueText: { flex: 1, fontSize: 12, color: Colors.subtle },
});
