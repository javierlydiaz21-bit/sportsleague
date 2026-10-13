import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TrendChart } from '@/components/charts/trend-chart';
import { MatchRow } from '@/components/league/match-row';
import { Badge, Card, EmptyState, SectionTitle, Table, TeamBadge, Td, Th } from '@/components/ui';
import { byId, idsParam } from '@/lib/compose';
import { playerName } from '@/lib/format';
import { safeGet, serverGet } from '@/lib/server';
import type { LeagueDetail, LiveMatchSummary, Match, Player, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type TeamDetail = Team & { players: Player[] };
interface TrendPoint {
  matchIndex: number;
  pointsCumulative: number;
  goalDifferenceCumulative: number;
  result: string;
  seasonId: string;
}

const ELIGIBILITY: Record<Player['eligibilityStatus'], { label: string; tone: 'green' | 'red' | 'amber' }> = {
  ELIGIBLE: { label: 'Habilitado', tone: 'green' },
  INELIGIBLE: { label: 'No elegible', tone: 'red' },
  PENDING: { label: 'Pendiente', tone: 'amber' },
};

const loadTeam = cache((id: string) => serverGet<TeamDetail>(`/teams/${id}`).catch(() => null));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const team = await loadTeam(id);
  return { title: team?.name ?? 'Equipo' };
}

export default async function TeamPage({ params }: { params: Params }) {
  const { id } = await params;
  const team = await loadTeam(id);
  if (!team) notFound();

  const [league, matches, trend] = await Promise.all([
    safeGet<LeagueDetail | null>(`/leagues/${team.leagueId}`, null),
    safeGet<Match[]>(`/matches?teamId=${team.id}&limit=50`, []),
    safeGet<TrendPoint[]>(`/analytics/team-trend/${team.id}`, []),
  ]);
  const rivals = idsParam(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
  const [teams, live] = await Promise.all([
    rivals ? safeGet<Team[]>(`/teams?ids=${rivals}`, []) : Promise.resolve([] as Team[]),
    matches.length ? safeGet<LiveMatchSummary[]>(`/live/matches?ids=${idsParam(matches.map((m) => m.id))}`, []) : Promise.resolve([]),
  ]);
  const teamMap = byId(teams.length ? teams : [team]);
  const liveMap = new Map(live.map((m) => [m.matchId, m]));
  const category = league?.categories.find((c) => c.id === team.categoryId);
  const latestSeason = trend.at(-1)?.seasonId;
  const seasonTrend = trend.filter((point) => point.seasonId === latestSeason);

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <TeamBadge name={team.name} color={team.color} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{team.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {league ? (
              <Link href={`/ligas/${league.id}`} className="hover:text-fg">
                {league.name}
              </Link>
            ) : (
              'Liga'
            )}
            {category ? ` · ${category.name}` : ''}
            {team.coachName ? ` · DT ${team.coachName}` : ''}
          </p>
        </div>
      </div>

      {seasonTrend.length > 1 && (
        <section>
          <SectionTitle title="Evolución en la temporada" description="Puntos acumulados partido a partido (cálculo del Analytics Service)." />
          <Card className="p-4">
            <TrendChart points={seasonTrend.map((p) => ({ x: p.matchIndex, y: p.pointsCumulative, label: p.result }))} color={team.color ?? undefined} />
          </Card>
        </section>
      )}

      <section>
        <SectionTitle title="Plantilla" description={`${team.players.length} jugadores inscritos`} />
        {team.players.length === 0 ? (
          <EmptyState title="Sin jugadores inscritos" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-12 text-center">#</Th>
                <Th>Jugador</Th>
                <Th>Posición</Th>
                <Th>Elegibilidad</Th>
              </tr>
            </thead>
            <tbody>
              {team.players.map((player) => (
                <tr key={player.id}>
                  <Td className="tabular text-center text-muted">{player.jerseyNumber ?? '–'}</Td>
                  <Td className="font-medium">{playerName(player)}</Td>
                  <Td className="text-muted">{player.position ?? '—'}</Td>
                  <Td>
                    <Badge tone={ELIGIBILITY[player.eligibilityStatus].tone}>{ELIGIBILITY[player.eligibilityStatus].label}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <SectionTitle title="Partidos" />
        {matches.length === 0 ? (
          <EmptyState title="Aún no hay partidos programados" />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match} teams={teamMap} live={liveMap.get(match.id)} venues={byId(league?.venues ?? [])} href={`/partidos/${match.id}`} />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
