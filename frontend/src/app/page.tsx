import { CalendarDays, ChartLine, Radio, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { HomeHero } from '@/components/home/hero';
import { LeagueCard } from '@/components/league/league-card';
import { MatchRow } from '@/components/league/match-row';
import { ButtonLink, Card, EmptyState, LiveBadge, SectionTitle, TeamBadge } from '@/components/ui';
import { qs } from '@/lib/api';
import { byId, idsParam } from '@/lib/compose';
import { safeGet } from '@/lib/server';
import type { League, LiveMatchSummary, Match, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Calendario automático',
    text: 'Round-robin con localía equilibrada, disponibilidad de canchas y descanso mínimo entre partidos.',
  },
  { icon: ShieldCheck, title: 'Árbitros asignados', text: 'Según su disponibilidad, zona y categoría certificada, sin cruces de horario.' },
  { icon: Radio, title: 'Marcador en vivo', text: 'Goles, tarjetas y cambios en tiempo real para todos los espectadores conectados.' },
  { icon: ChartLine, title: 'Estadísticas al instante', text: 'Tabla de posiciones, goleadores y tarjetas recalculados al cerrar cada acta.' },
];

export default async function HomePage() {
  const [leagues, live, upcoming] = await Promise.all([
    safeGet<League[]>('/leagues?limit=6', []),
    safeGet<LiveMatchSummary[]>('/live/matches?status=LIVE&limit=6', []),
    safeGet<Match[]>(`/matches${qs({ status: 'SCHEDULED', from: new Date().toISOString(), limit: 6 })}`, []),
  ]);
  const teamIds = idsParam([...live, ...upcoming].flatMap((m) => [m.homeTeamId, m.awayTeamId]));
  const leagueIds = idsParam([...live, ...upcoming].map((m) => m.leagueId));
  const [teams, matchLeagues] = await Promise.all([
    teamIds ? safeGet<Team[]>(`/teams?ids=${teamIds}`, []) : Promise.resolve([]),
    leagueIds ? safeGet<League[]>(`/leagues?ids=${leagueIds}`, []) : Promise.resolve([]),
  ]);
  const teamMap = byId(teams);
  const leagueMap = byId(matchLeagues);

  return (
    <>
      <HomeHero />
      <div className="mx-auto max-w-6xl space-y-20 px-4 pt-12 sm:px-6 sm:pt-16">
        {live.length > 0 && (
          <section>
            <SectionTitle title="En vivo ahora" description="Resultados que se actualizan en tiempo real." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((match) => {
                const home = teamMap.get(match.homeTeamId);
                const away = teamMap.get(match.awayTeamId);
                return (
                  <Link key={match.matchId} href={`/partidos/${match.matchId}`} className="rounded-xl border border-line bg-elevated p-4 transition hover:border-line-strong">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs text-muted">{leagueMap.get(match.leagueId)?.name ?? 'Liga'}</span>
                      <LiveBadge />
                    </div>
                    <div className="mt-4 space-y-2">
                      {[
                        { team: home, score: match.score.home },
                        { team: away, score: match.score.away },
                      ].map(({ team, score }, index) => (
                        <div key={index} className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <TeamBadge name={team?.name ?? '?'} color={team?.color} size="sm" />
                            <span className="truncate text-sm font-medium">{team?.name ?? 'Equipo'}</span>
                          </span>
                          <span className="tabular text-xl font-semibold">{score}</span>
                        </div>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <SectionTitle
            title="Próximos partidos"
            action={
              <Link href="/ligas" className="text-sm text-muted hover:text-fg">
                Ver ligas
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState title="Aún no hay partidos programados" description="Cuando una liga publique su calendario, sus partidos aparecerán aquí." />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {upcoming.map((match) => (
                <div key={match.id}>
                  <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-subtle">
                    {leagueMap.get(match.leagueId)?.name ?? 'Liga'} · Jornada {match.round}
                  </p>
                  <MatchRow match={match} teams={teamMap} href={`/partidos/${match.id}`} />
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <SectionTitle
            title="Ligas activas"
            action={
              <Link href="/ligas" className="text-sm text-muted hover:text-fg">
                Ver todas
              </Link>
            }
          />
          {leagues.length === 0 ? (
            <EmptyState
              title="Todavía no hay ligas públicas"
              description="Las ligas aparecen aquí cuando un administrador las aprueba."
              action={<ButtonLink href="/registro">Crear la primera liga</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leagues.map((league) => (
                <LeagueCard key={league.id} league={league} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 border-t border-line pt-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="h-5 w-5 text-brand" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
