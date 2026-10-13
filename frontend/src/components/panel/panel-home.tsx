'use client';

import { CalendarRange, Plus, ShieldCheck, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { LEAGUE_STATUS_LABEL, SPORT_LABEL, formatDate } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { League } from '@/lib/types';
import { RequireAuth } from '../require-auth';
import { Badge, ButtonLink, EmptyState, Notice, PageHeader, PageSpinner } from '../ui';

export const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', SUSPENDED: 'red' } as const;

const STEPS = [
  { icon: Trophy, title: 'Crea la liga', text: 'Un administrador la revisa y la autoriza.' },
  { icon: Users, title: 'Inscribe equipos', text: 'Con validación automática de edad por categoría.' },
  { icon: ShieldCheck, title: 'Registra árbitros', text: 'Con su zona y disponibilidad horaria.' },
  { icon: CalendarRange, title: 'Genera el calendario', text: 'Y publícalo: se asignan árbitros y se avisa a todos.' },
];

function MyLeagues() {
  const { api } = useAuth();
  const { data: leagues, loading, error } = useAsync(() => api.get<League[]>('/leagues/mine'), [api]);

  if (loading && !leagues) return <PageSpinner />;
  return (
    <div>
      <PageHeader
        title="Mis ligas"
        description="Administra tus competiciones: equipos, árbitros, calendario y resultados."
        actions={
          <ButtonLink href="/panel/ligas/nueva">
            <Plus className="h-4 w-4" /> Nueva liga
          </ButtonLink>
        }
      />
      {error && <Notice tone="red">{error}</Notice>}
      {leagues && leagues.length === 0 ? (
        <div className="space-y-8">
          <EmptyState
            title="Todavía no tienes ligas"
            description="Crea tu primera liga en menos de un minuto."
            action={<ButtonLink href="/panel/ligas/nueva">Crear mi primera liga</ButtonLink>}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <div key={title}>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs text-muted">{index + 1}</span>
                  {title}
                </p>
                <p className="mt-1.5 flex items-start gap-2 pl-8 text-sm text-muted">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues?.map((league) => (
            <Link
              key={league.id}
              href={`/panel/ligas/${league.id}`}
              className="rounded-xl border border-line bg-elevated p-5 transition hover:border-line-strong hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={STATUS_TONE[league.status]}>{LEAGUE_STATUS_LABEL[league.status]}</Badge>
                <span className="text-xs text-muted">{SPORT_LABEL[league.sport]}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{league.name}</h3>
              <p className="mt-1 text-xs text-muted">
                Creada el {formatDate(league.createdAt)}
                {league.city ? ` · ${league.city}` : ''}
              </p>
              {league._count && (
                <p className="mt-4 text-xs text-muted">
                  {league._count.seasons} temporada(s) · {league._count.categories} categoría(s) · {league._count.venues} cancha(s)
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PanelHome() {
  return <RequireAuth roles={['ORGANIZER', 'ADMIN']}>{() => <MyLeagues />}</RequireAuth>;
}
