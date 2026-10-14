'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LEAGUE_STATUS_LABEL, SPORT_LABEL } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Fixture, LeagueDetail, Referee, Team } from '@/lib/types';
import { RequireAuth } from '../require-auth';
import { Badge, EmptyState, PageHeader, PageSpinner, Tabs } from '../ui';
import { AnalyticsTab } from './league/analytics-tab';
import { CategoriesTab } from './league/categories-tab';
import { FixtureTab } from './league/fixture-tab';
import { OverviewTab } from './league/overview-tab';
import { RefereesTab } from './league/referees-tab';
import { SeasonsTab } from './league/seasons-tab';
import { SetupContext, computeSteps, type SetupContextValue, type SetupProgress, type StepKey } from './league/setup-flow';
import { StatsTab } from './league/stats-tab';
import { TeamsTab } from './league/teams-tab';
import { VenuesTab } from './league/venues-tab';
import { STATUS_TONE } from './panel-home';

export interface LeagueTabProps {
  league: LeagueDetail;
  reload: () => Promise<void>;
  goTo: (tab: string) => void;
}

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'temporadas', label: 'Temporadas' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'canchas', label: 'Canchas' },
  { key: 'equipos', label: 'Equipos' },
  { key: 'arbitros', label: 'Árbitros' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'estadisticas', label: 'Estadísticas' },
  { key: 'analitica', label: 'Analítica' },
];

function Manager({ id }: { id: string }) {
  const { api } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as string) : 'resumen';
  const { data: league, loading, error, reload } = useAsync(() => api.get<LeagueDetail>(`/leagues/${id}`), [api, id]);

  // Conteos de la lista de pasos (equipos, árbitros, calendario publicado). Se comparten con todas
  // las secciones del flujo y se vuelven a consultar al cambiar de pestaña.
  const { data: progress, reload: refreshProgress } = useAsync(async (): Promise<SetupProgress | undefined> => {
    if (!league) return undefined;
    const [teams, referees, fixtures] = await Promise.all([
      api.get<Team[]>(`/teams?leagueId=${league.id}`).catch(() => [] as Team[]),
      api.get<Referee[]>(`/referees?leagueId=${league.id}`).catch(() => [] as Referee[]),
      league.seasons[0] ? api.get<Fixture[]>(`/seasons/${league.seasons[0].id}/fixtures`).catch(() => [] as Fixture[]) : Promise.resolve([] as Fixture[]),
    ]);
    return { teams: teams.length, referees: referees.length, published: fixtures.some((f) => f.status === 'PUBLISHED') };
  }, [api, league, tab]);

  // Formularios con cambios sin guardar en la sección visible (ver useUnsavedChanges).
  const [unsaved, setUnsaved] = useState<ReadonlySet<string>>(new Set());
  const unsavedRef = useRef(unsaved);
  unsavedRef.current = unsaved;
  const reportUnsaved = useCallback((key: string, dirty: boolean) => {
    setUnsaved((prev) => {
      if (prev.has(key) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const confirmLeave = useCallback(
    () => unsavedRef.current.size === 0 || window.confirm('Tienes cambios sin guardar en esta sección. Si continúas, se perderán. ¿Quieres continuar?'),
    [],
  );

  if (loading && !league) return <PageSpinner />;
  if (!league) return <EmptyState className="mt-10" title="No encontramos la liga" description={error ?? undefined} />;

  const goTo = (key: string) => {
    if (key !== tab && !confirmLeave()) return;
    router.replace(`/panel/ligas/${id}?tab=${key}`, { scroll: false });
  };
  // Los botones del flujo crean una entrada en el historial (volver atrás funciona) y suben al inicio.
  const goToStep = (key: StepKey) => {
    router.push(`/panel/ligas/${id}?tab=${key}`, { scroll: false });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const props: LeagueTabProps = { league, reload, goTo };
  const steps = computeSteps(league, progress);
  const setup: SetupContextValue = { league, steps, progress, refreshProgress, goToStep, confirmLeave, reportUnsaved };
  const doneTabs = new Set(steps.filter((s) => s.done && s.key !== 'resumen').map((s) => s.key as string));
  const tabs = TABS.map((t) => (doneTabs.has(t.key) ? { ...t, done: true } : t));

  return (
    <SetupContext.Provider value={setup}>
      <div>
        <PageHeader
          eyebrow={
            <Link href="/panel" className="hover:text-fg">
              ← Mis ligas
            </Link>
          }
          title={league.name}
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[league.status]}>{LEAGUE_STATUS_LABEL[league.status]}</Badge>
              <span>{SPORT_LABEL[league.sport]}</span>
              {league.city && <span>· {league.city}</span>}
            </span>
          }
          actions={
            league.status === 'APPROVED' && (
              <Link href={`/ligas/${league.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
                Ver página pública <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )
          }
        />
        <Tabs tabs={tabs} active={tab} onChange={goTo} />
        <div className="pt-6">
          {tab === 'resumen' && <OverviewTab {...props} />}
          {tab === 'temporadas' && <SeasonsTab {...props} />}
          {tab === 'categorias' && <CategoriesTab {...props} />}
          {tab === 'canchas' && <VenuesTab {...props} />}
          {tab === 'equipos' && <TeamsTab {...props} />}
          {tab === 'arbitros' && <RefereesTab {...props} />}
          {tab === 'calendario' && <FixtureTab {...props} />}
          {tab === 'estadisticas' && <StatsTab {...props} />}
          {tab === 'analitica' && <AnalyticsTab {...props} />}
        </div>
      </div>
    </SetupContext.Provider>
  );
}

export function LeagueManager({ id }: { id: string }) {
  return <RequireAuth roles={['ORGANIZER', 'ADMIN']}>{() => <Manager id={id} />}</RequireAuth>;
}
