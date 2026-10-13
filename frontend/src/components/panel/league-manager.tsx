'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LEAGUE_STATUS_LABEL, SPORT_LABEL } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { LeagueDetail } from '@/lib/types';
import { RequireAuth } from '../require-auth';
import { Badge, EmptyState, PageHeader, PageSpinner, Tabs } from '../ui';
import { AnalyticsTab } from './league/analytics-tab';
import { CategoriesTab } from './league/categories-tab';
import { FixtureTab } from './league/fixture-tab';
import { OverviewTab } from './league/overview-tab';
import { RefereesTab } from './league/referees-tab';
import { SeasonsTab } from './league/seasons-tab';
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

  if (loading && !league) return <PageSpinner />;
  if (!league) return <EmptyState className="mt-10" title="No encontramos la liga" description={error ?? undefined} />;

  const goTo = (key: string) => router.replace(`/panel/ligas/${id}?tab=${key}`, { scroll: false });
  const props: LeagueTabProps = { league, reload, goTo };

  return (
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
      <Tabs tabs={TABS} active={tab} onChange={goTo} />
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
  );
}

export function LeagueManager({ id }: { id: string }) {
  return <RequireAuth roles={['ORGANIZER', 'ADMIN']}>{() => <Manager id={id} />}</RequireAuth>;
}
