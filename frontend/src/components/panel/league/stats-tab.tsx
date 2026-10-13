'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { byId, completeStandings } from '@/lib/compose';
import { errorMessage } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Standing, Team } from '@/lib/types';
import { StandingsTable } from '../../league/standings-table';
import { useToast } from '../../overlay';
import { Button, EmptyState, Pills, SectionTitle } from '../../ui';
import type { LeagueTabProps } from '../league-manager';

export function StatsTab({ league }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const [seasonId, setSeasonId] = useState(league.seasons[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(league.categories[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const { data, reload } = useAsync(async () => {
    if (!seasonId || !categoryId) return { standings: [] as Standing[], teams: [] as Team[] };
    const [standings, teams] = await Promise.all([
      api.get<Standing[]>(`/standings/${seasonId}?categoryId=${categoryId}`),
      api.get<Team[]>(`/teams?categoryId=${categoryId}`),
    ]);
    return { standings, teams };
  }, [api, seasonId, categoryId]);

  if (!seasonId || !categoryId) return <EmptyState title="Faltan temporada o categoría" />;

  const recalculate = async () => {
    setBusy(true);
    try {
      const result = await api.post<{ reconciled: number }>('/statistics/recalculate', { seasonId, categoryId, reconcile: true });
      await reload();
      toast.success(
        result.reconciled > 0
          ? `Tabla recalculada: se recuperaron ${result.reconciled} acta(s) desde el Live Score Service`
          : 'Tabla recalculada desde las actas oficiales',
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
        <Pills options={league.seasons.map((s) => ({ value: s.id, label: s.name }))} value={seasonId} onChange={setSeasonId} />
        <Pills options={league.categories.map((c) => ({ value: c.id, label: c.name }))} value={categoryId} onChange={setCategoryId} />
      </div>
      <SectionTitle
        title="Tabla de posiciones"
        description="Se recalcula sola al cerrar cada acta. Si un evento se perdió, recalcula desde las actas oficiales (idempotente)."
        action={
          <Button variant="secondary" size="sm" onClick={recalculate} loading={busy}>
            <RefreshCw className="h-4 w-4" /> Recalcular
          </Button>
        }
      />
      {data && data.teams.length > 0 ? (
        <StandingsTable rows={completeStandings(data.standings, data.teams)} teams={byId(data.teams)} />
      ) : (
        <EmptyState title="Sin equipos en esta categoría" />
      )}
    </div>
  );
}
