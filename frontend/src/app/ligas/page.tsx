import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import { LeagueCard } from '@/components/league/league-card';
import { EmptyState, Input, PageHeader, Pills } from '@/components/ui';
import { qs } from '@/lib/api';
import { safeGet } from '@/lib/server';
import type { League, Sport } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ligas' };

const SPORTS: { value: Sport | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'FOOTBALL', label: 'Fútbol' },
  { value: 'BASKETBALL', label: 'Básquet' },
  { value: 'VOLLEYBALL', label: 'Vóley' },
];

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ q?: string; sport?: string }> }) {
  const { q, sport } = await searchParams;
  const selected = (SPORTS.find((s) => s.value === sport)?.value ?? 'ALL') as Sport | 'ALL';
  const leagues = await safeGet<League[]>(`/leagues${qs({ q, sport: selected === 'ALL' ? undefined : selected, limit: 60 })}`, []);

  return (
    <div>
      <PageHeader title="Ligas" description="Ligas aprobadas por la federación. Consulta posiciones, calendario y resultados." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Pills options={SPORTS} value={selected} hrefFor={(value) => `/ligas${qs({ q, sport: value === 'ALL' ? undefined : value })}`} />
        <form className="relative w-full sm:w-72" action="/ligas">
          {selected !== 'ALL' && <input type="hidden" name="sport" value={selected} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre o ciudad" className="pl-9" />
        </form>
      </div>
      {leagues.length === 0 ? (
        <EmptyState title="No encontramos ligas" description="Prueba con otra búsqueda o con otro deporte." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      )}
    </div>
  );
}
