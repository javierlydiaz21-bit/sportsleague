import { useIsFocused, useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ErrorNotice } from '@/components/error-notice';
import { LiveMatchCard } from '@/components/match-cards';
import { SessionBar } from '@/components/session-bar';
import { Content, EmptyState, Loading } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { byId, idsParam } from '@/lib/compose';
import { useInterval, useLoader } from '@/lib/hooks';
import type { League, LiveMatchSummary, Team } from '@/lib/types';

/** Partidos en curso: GET /live/matches?status=LIVE (como la portada de la web). */
export default function LiveScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const focused = useIsFocused();

  const state = useLoader(async () => {
    const live = await api.get<LiveMatchSummary[]>('/live/matches?status=LIVE&limit=50');
    const teamIds = idsParam(live.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
    const leagueIds = idsParam(live.map((m) => m.leagueId));
    const [teams, leagues] = await Promise.all([
      teamIds ? api.get<Team[]>(`/teams?ids=${teamIds}`).catch(() => [] as Team[]) : Promise.resolve([] as Team[]),
      leagueIds ? api.get<League[]>(`/leagues?ids=${leagueIds}`).catch(() => [] as League[]) : Promise.resolve([] as League[]),
    ]);
    return { live, teams: byId(teams), leagues: byId(leagues) };
  });

  // Mientras la pestaña está a la vista, la lista se actualiza cada 30 s.
  useInterval(state.revalidate, 30_000, focused);

  if (state.loading && !state.data && !state.error) return <Loading label="Buscando partidos en vivo…" />;

  const data = state.data;
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={data?.live ?? []}
      keyExtractor={(item) => item.matchId}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} colors={[Colors.wine]} tintColor={Colors.wine} />}
      ListHeaderComponent={
        <Content style={styles.header}>
          <SessionBar />
          {state.error && <ErrorNotice error={state.error} onRetry={state.reload} retrying={state.loading} />}
        </Content>
      }
      ListEmptyComponent={
        data ? (
          <EmptyState
            icon="radio-outline"
            title="No hay partidos en vivo ahora"
            description="Cuando un árbitro inicie un partido aparecerá aquí. Mira los próximos en la pestaña «Próximos»."
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <Content>
          <LiveMatchCard
            leagueName={data?.leagues.get(item.leagueId)?.name}
            home={data?.teams.get(item.homeTeamId)}
            away={data?.teams.get(item.awayTeamId)}
            score={item.score}
            onPress={() => router.push(`/partido/${item.matchId}`)}
          />
        </Content>
      )}
      ItemSeparatorComponent={Separator}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { gap: Spacing.md, marginBottom: Spacing.md },
  separator: { height: Spacing.md },
});
