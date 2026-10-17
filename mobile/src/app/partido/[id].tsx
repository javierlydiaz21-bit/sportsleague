import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorNotice } from '@/components/error-notice';
import { Lineup, Scoreboard, Timeline } from '@/components/match-parts';
import { Button, Card, Content, Loading, Notice } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { byId } from '@/lib/compose';
import { useLoader } from '@/lib/hooks';
import { useLiveMatch } from '@/lib/live';
import { loadMatchData, type MatchData } from '@/lib/match-data';
import type { LiveSnapshot } from '@/lib/types';

/**
 * Detalle público del partido (como frontend/src/app/partidos/[id]): marcador en tiempo real por
 * Socket.IO, línea de tiempo de eventos y número de espectadores conectados.
 */
export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const state = useLoader(() => loadMatchData(api, id), id);

  if (state.data) return <MatchView data={state.data} />;
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

function MatchView({ data }: { data: MatchData }) {
  const { match, teams, players, league } = data;
  const { user, api } = useAuth();
  const { snapshot, connected } = useLiveMatch(match.id, data.snapshot, () =>
    api.get<LiveSnapshot>(`/matches/${match.id}/live`),
  );
  const router = useRouter();
  const teamMap = useMemo(() => byId(teams), [teams]);
  const playerMap = useMemo(() => byId(players), [players]);
  const home = teamMap.get(match.homeTeamId);
  const away = teamMap.get(match.awayTeamId);
  const sport = league?.sport ?? 'FOOTBALL';
  const venue = league?.venues?.find((v) => v.id === match.venueId);
  const status = snapshot.status === 'NOT_STARTED' && match.status === 'SUSPENDED' ? 'SUSPENDED' : snapshot.status;
  const title = `${home?.name ?? 'Local'} vs ${away?.name ?? 'Visitante'}`;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />
      <Content style={styles.stack}>
        {league && <Text style={styles.league}>{league.name}</Text>}
        <Scoreboard
          home={home}
          away={away}
          score={snapshot.score}
          status={status}
          scheduledAt={match.scheduledAt}
          venueName={venue?.name}
          viewers={snapshot.viewers}
          connected={connected}
          subtitle={`Jornada ${match.round}`}
        />

        {match.status === 'SUSPENDED' && match.suspensionReason ? (
          <Notice tone="amber" icon="pause-circle-outline" title="Partido suspendido">
            {match.suspensionReason}
          </Notice>
        ) : null}

        {user?.role === 'REFEREE' && status !== 'FINISHED' && (
          <Button
            title="Control del partido"
            icon="radio-outline"
            variant="secondary"
            onPress={() => router.push(`/arbitro/${match.id}`)}
          />
        )}

        <Card>
          <Text style={styles.cardTitle}>Minuto a minuto</Text>
          <Timeline events={snapshot.events} homeTeamId={match.homeTeamId} teams={teamMap} players={playerMap} sport={sport} />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Plantillas</Text>
          <View style={styles.lineups}>
            <Lineup team={home} players={players.filter((p) => p.teamId === match.homeTeamId)} />
            <Lineup team={away} players={players.filter((p) => p.teamId === match.awayTeamId)} />
          </View>
        </Card>
      </Content>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  stack: { gap: Spacing.lg },
  league: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  lineups: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
});
