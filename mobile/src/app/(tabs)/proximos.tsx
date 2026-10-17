import { useRouter } from 'expo-router';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { ErrorNotice } from '@/components/error-notice';
import { UpcomingMatchCard } from '@/components/match-cards';
import { SessionBar } from '@/components/session-bar';
import { Content, EmptyState, Loading } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { byId, idsParam } from '@/lib/compose';
import { dayKey, formatDay } from '@/lib/format';
import { useLoader } from '@/lib/hooks';
import type { League, Match, Team } from '@/lib/types';

/** Partidos programados: GET /matches?status=SCHEDULED&from=ahora (el mismo filtro que la web). */
export default function UpcomingScreen() {
  const { api } = useAuth();
  const router = useRouter();

  const state = useLoader(async () => {
    const matches = await api.get<Match[]>(`/matches${qs({ status: 'SCHEDULED', from: new Date().toISOString(), limit: 40 })}`);
    const teamIds = idsParam(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
    const leagueIds = idsParam(matches.map((m) => m.leagueId));
    const [teams, leagues] = await Promise.all([
      teamIds ? api.get<Team[]>(`/teams?ids=${teamIds}`).catch(() => [] as Team[]) : Promise.resolve([] as Team[]),
      leagueIds ? api.get<League[]>(`/leagues?ids=${leagueIds}`).catch(() => [] as League[]) : Promise.resolve([] as League[]),
    ]);
    const sections: { key: string; title: string; data: Match[] }[] = [];
    for (const match of matches) {
      const key = dayKey(match.scheduledAt);
      const last = sections[sections.length - 1];
      if (last?.key === key) last.data.push(match);
      else sections.push({ key, title: formatDay(match.scheduledAt), data: [match] });
    }
    return { sections, teams: byId(teams), leagues: byId(leagues) };
  });

  if (state.loading && !state.data && !state.error) return <Loading label="Cargando el calendario…" />;

  const data = state.data;
  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.content}
      sections={data?.sections ?? []}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
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
            icon="calendar-outline"
            title="Aún no hay partidos programados"
            description="Cuando una liga publique su calendario, sus partidos aparecerán aquí."
          />
        ) : undefined
      }
      renderSectionHeader={({ section }) => (
        <Content>
          <Text style={styles.day}>{section.title}</Text>
        </Content>
      )}
      renderItem={({ item }) => {
        const league = data?.leagues.get(item.leagueId);
        return (
          <Content style={styles.item}>
            <UpcomingMatchCard
              leagueName={league?.name}
              round={item.round}
              scheduledAt={item.scheduledAt}
              home={data?.teams.get(item.homeTeamId)}
              away={data?.teams.get(item.awayTeamId)}
              onPress={() => router.push(`/partido/${item.id}`)}
            />
          </Content>
        );
      }}
      SectionSeparatorComponent={Spacer}
    />
  );
}

function Spacer() {
  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { gap: Spacing.md, marginBottom: Spacing.sm },
  day: { fontSize: 13, fontWeight: '700', color: Colors.wine, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md },
  item: { marginTop: Spacing.sm },
  spacer: { height: Spacing.xs },
});
