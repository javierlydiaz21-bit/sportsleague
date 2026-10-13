import { MapPin, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import { FollowButton } from '@/components/league/follow-button';
import { MatchRow } from '@/components/league/match-row';
import { StandingsTable } from '@/components/league/standings-table';
import { Badge, Card, EmptyState, Pills, Table, Tabs, TeamBadge, Td, Th } from '@/components/ui';
import { qs } from '@/lib/api';
import { byId, completeStandings, groupByRound, idsParam } from '@/lib/compose';
import { SPORT_LABEL, TIEBREAKER_LABEL, formatDateOnly, playerName, scoreWord } from '@/lib/format';
import { safeGet, serverGet } from '@/lib/server';
import type {
  DisciplinaryRecord,
  Fixture,
  LeagueDetail,
  LiveMatchSummary,
  Player,
  Standing,
  Team,
  TopScorer,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'posiciones', label: 'Posiciones' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'goleadores', label: 'Goleadores' },
  { key: 'disciplina', label: 'Disciplina' },
  { key: 'equipos', label: 'Equipos' },
];

type Params = Promise<{ id: string }>;
type Search = Promise<{ tab?: string; temporada?: string; categoria?: string }>;

/** Memoizado por solicitud: los metadatos (SEO) y la página comparten la misma lectura. */
const loadLeague = cache((id: string) => serverGet<LeagueDetail>(`/leagues/${id}`).catch(() => null));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const league = await loadLeague(id);
  return league
    ? { title: league.name, description: `Tabla de posiciones, calendario y resultados de ${league.name} (${SPORT_LABEL[league.sport]}).` }
    : { title: 'Liga' };
}

export default async function LeaguePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  const sp = await searchParams;
  const league = await loadLeague(id);
  if (!league) notFound();

  const season = league.seasons.find((s) => s.id === sp.temporada) ?? league.seasons[0];
  const category = league.categories.find((c) => c.id === sp.categoria) ?? league.categories[0];
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : 'posiciones';
  const href = (overrides: Record<string, string | undefined>) =>
    `/ligas/${id}${qs({ tab, temporada: season?.id, categoria: category?.id, ...overrides })}`;

  const [teams, followers] = await Promise.all([
    category ? safeGet<Team[]>(`/teams?categoryId=${category.id}`, []) : Promise.resolve([] as Team[]),
    safeGet<{ followers: number }>(`/subscriptions/leagues/${id}`, { followers: 0 }),
  ]);
  const teamMap = byId(teams);
  const words = scoreWord(league.sport);

  let content: ReactNode;
  if (!season || !category) {
    content = <EmptyState title="Esta liga aún no tiene temporadas o categorías" description="El organizador está preparando la competición." />;
  } else if (tab === 'posiciones') {
    const standings = await safeGet<Standing[]>(`/standings/${season.id}${qs({ categoryId: category.id })}`, []);
    const rules = category.rules;
    content =
      teams.length === 0 ? (
        <EmptyState title="Aún no hay equipos inscritos en esta categoría" />
      ) : (
        <div className="space-y-3">
          <StandingsTable rows={completeStandings(standings, teams)} teams={teamMap} scoreLabel={league.sport === 'FOOTBALL' ? 'G' : league.sport === 'BASKETBALL' ? 'P' : 'S'} />
          {rules && (
            <p className="text-xs text-muted">
              Victoria {rules.pointsWin} pts · Empate {rules.pointsDraw} · Derrota {rules.pointsLoss}. Desempate:{' '}
              {rules.tiebreakerCriteria.map((c) => TIEBREAKER_LABEL[c] ?? c).join(', ') || 'puntos'}.
            </p>
          )}
        </div>
      );
  } else if (tab === 'calendario') {
    const [fixtures, live] = await Promise.all([
      safeGet<Fixture[]>(`/seasons/${season.id}/fixtures${qs({ categoryId: category.id })}`, []),
      safeGet<LiveMatchSummary[]>(`/live/matches${qs({ seasonId: season.id, categoryId: category.id })}`, []),
    ]);
    const matches = fixtures.filter((f) => f.status === 'PUBLISHED').flatMap((f) => f.matches);
    const liveMap = new Map(live.map((m) => [m.matchId, m]));
    const venues = byId(league.venues);
    content =
      matches.length === 0 ? (
        <EmptyState title="El calendario aún no está publicado" description="Cuando el organizador lo publique verás aquí todas las jornadas." />
      ) : (
        <div className="space-y-6">
          {groupByRound(matches).map(([round, list]) => (
            <div key={round}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Jornada {round}</p>
              <Card className="divide-y divide-line overflow-hidden">
                {list.map((match) => (
                  <MatchRow key={match.id} match={match} teams={teamMap} live={liveMap.get(match.id)} venues={venues} href={`/partidos/${match.id}`} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      );
  } else if (tab === 'goleadores' || tab === 'disciplina') {
    const rows =
      tab === 'goleadores'
        ? await safeGet<TopScorer[]>(`/top-scorers/${season.id}${qs({ categoryId: category.id, limit: 30 })}`, [])
        : await safeGet<DisciplinaryRecord[]>(`/disciplinary/${season.id}${qs({ categoryId: category.id })}`, []);
    const ids = idsParam(rows.map((r) => r.playerId));
    const players = ids ? byId(await safeGet<Player[]>(`/players?ids=${ids}`, [])) : new Map<string, Player>();
    content =
      rows.length === 0 ? (
        <EmptyState title={tab === 'goleadores' ? `Aún no hay ${words.plural} registrados` : 'Sin tarjetas registradas'} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-10 text-center">#</Th>
              <Th>Jugador</Th>
              <Th>Equipo</Th>
              {tab === 'goleadores' ? (
                <Th className="text-center capitalize">{words.plural}</Th>
              ) : (
                <>
                  <Th className="text-center">Amarillas</Th>
                  <Th className="text-center">Rojas</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const team = teamMap.get(row.teamId);
              return (
                <tr key={row.playerId} className="tabular">
                  <Td className="text-center text-muted">{index + 1}</Td>
                  <Td className="font-medium">{playerName(players.get(row.playerId))}</Td>
                  <Td>
                    <span className="flex items-center gap-2 text-muted">
                      <TeamBadge name={team?.name ?? '?'} color={team?.color} size="sm" />
                      {team?.name ?? '—'}
                    </span>
                  </Td>
                  {'goals' in row ? (
                    <Td className="text-center font-semibold">{row.goals}</Td>
                  ) : (
                    <>
                      <Td className="text-center">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-3 w-2 rounded-[2px] bg-yellow-400" />
                          {row.yellowCards}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-3 w-2 rounded-[2px] bg-red-500" />
                          {row.redCards}
                        </span>
                      </Td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      );
  } else {
    content =
      teams.length === 0 ? (
        <EmptyState title="Aún no hay equipos inscritos" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/equipos/${team.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-elevated p-4 transition hover:border-line-strong">
              <TeamBadge name={team.name} color={team.color} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{team.name}</p>
                <p className="text-xs text-muted">
                  {team._count?.players ?? 0} jugadores{team.coachName ? ` · DT ${team.coachName}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      );
  }

  return (
    <div>
      <div className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">{SPORT_LABEL[league.sport]}</Badge>
            {league.status !== 'APPROVED' && <Badge tone="amber">Vista previa · {league.status}</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{league.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
            {league.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {league.city}
              </span>
            )}
            {league.ownerName && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4" /> {league.ownerName}
              </span>
            )}
            {season && (
              <span>
                {season.name} · {formatDateOnly(season.startDate)} – {formatDateOnly(season.endDate)}
              </span>
            )}
          </div>
          {league.description && <p className="mt-3 max-w-2xl text-sm text-muted">{league.description}</p>}
        </div>
        <FollowButton leagueId={league.id} initialFollowers={followers.followers} />
      </div>

      {(league.seasons.length > 1 || league.categories.length > 1) && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-8">
          {league.seasons.length > 1 && (
            <Pills options={league.seasons.map((s) => ({ value: s.id, label: s.name }))} value={season?.id ?? ''} hrefFor={(value) => href({ temporada: value })} />
          )}
          {league.categories.length > 1 && (
            <Pills options={league.categories.map((c) => ({ value: c.id, label: c.name }))} value={category?.id ?? ''} hrefFor={(value) => href({ categoria: value })} />
          )}
        </div>
      )}

      <Tabs tabs={TABS} active={tab} hrefFor={(key) => href({ tab: key })} />
      <div className="pt-6">{content}</div>
    </div>
  );
}
