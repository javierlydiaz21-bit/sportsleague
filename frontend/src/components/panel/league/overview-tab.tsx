'use client';

import { Check, Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage, formatDateTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Fixture, Referee, Team } from '@/lib/types';
import { useToast } from '../../overlay';
import { Button, Card, Field, Input, Notice, SectionTitle, Textarea, cn } from '../../ui';
import type { LeagueTabProps } from '../league-manager';

export function OverviewTab({ league, reload, goTo }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ name: league.name, city: league.city ?? '', description: league.description ?? '' });
  const [saving, setSaving] = useState(false);

  const { data: progress } = useAsync(async () => {
    const [teams, referees, fixtures] = await Promise.all([
      api.get<Team[]>(`/teams?leagueId=${league.id}`).catch(() => [] as Team[]),
      api.get<Referee[]>(`/referees?leagueId=${league.id}`).catch(() => [] as Referee[]),
      league.seasons[0] ? api.get<Fixture[]>(`/seasons/${league.seasons[0].id}/fixtures`).catch(() => [] as Fixture[]) : Promise.resolve([] as Fixture[]),
    ]);
    return { teams: teams.length, referees: referees.length, published: fixtures.some((f) => f.status === 'PUBLISHED'), drafts: fixtures.length };
  }, [api, league.id, league.seasons]);

  const steps = [
    { done: league.status === 'APPROVED', label: 'Aprobación del administrador', tab: 'resumen', hint: league.status === 'PENDING' ? 'En revisión' : undefined },
    { done: league.seasons.length > 0, label: `Temporada (${league.seasons.length})`, tab: 'temporadas' },
    { done: league.categories.length > 0, label: `Categorías y reglamento (${league.categories.length})`, tab: 'categorias' },
    { done: league.venues.length > 0, label: `Canchas con disponibilidad (${league.venues.length})`, tab: 'canchas' },
    { done: (progress?.teams ?? 0) >= 2, label: `Equipos inscritos (${progress?.teams ?? '…'})`, tab: 'equipos' },
    { done: (progress?.referees ?? 0) > 0, label: `Árbitros registrados (${progress?.referees ?? '…'})`, tab: 'arbitros' },
    { done: !!progress?.published, label: 'Calendario publicado', tab: 'calendario' },
  ];

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/leagues/${league.id}`, form);
      await reload();
      toast.success('Datos de la liga actualizados');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Eliminar esta liga y toda su configuración? Esta acción no se puede deshacer.')) return;
    try {
      await api.del(`/leagues/${league.id}`);
      toast.success('Liga eliminada');
      router.push('/panel');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {league.status === 'PENDING' && (
          <Notice tone="amber" title="Pendiente de aprobación">
            Un administrador revisará tu liga. Mientras tanto puedes configurar temporadas, categorías, canchas, equipos y árbitros. Para generar y
            publicar el calendario la liga debe estar aprobada.
          </Notice>
        )}
        {league.status === 'APPROVED' && (
          <Notice tone="green" title="Liga aprobada">
            Es pública y ya puedes generar el calendario.{league.reviewedAt ? ` Aprobada el ${formatDateTime(league.reviewedAt)}.` : ''}
          </Notice>
        )}
        {(league.status === 'REJECTED' || league.status === 'SUSPENDED') && (
          <Notice tone="red" title={league.status === 'REJECTED' ? 'Liga rechazada' : 'Liga suspendida'}>
            {league.reviewNote ? `Motivo: ${league.reviewNote}` : 'Contacta al administrador para más información.'}
          </Notice>
        )}

        <div>
          <SectionTitle title="Pasos para poner en marcha la liga" />
          <Card className="divide-y divide-line">
            {steps.map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() => goTo(step.tab)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-surface"
              >
                {step.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : (
                  <Circle className="h-5 w-5 text-line-strong" />
                )}
                <span className={cn('flex-1', step.done ? 'text-muted' : 'font-medium')}>{step.label}</span>
                {step.hint && <span className="text-xs text-warn">{step.hint}</span>}
              </button>
            ))}
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <form onSubmit={save} className="space-y-4">
          <SectionTitle title="Datos de la liga" />
          <Field label="Nombre">
            <Input required minLength={3} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Ciudad">
            <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </Field>
          <Field label="Descripción">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Button type="submit" variant="secondary" loading={saving}>
            Guardar cambios
          </Button>
        </form>
        {league.status !== 'APPROVED' && (
          <div className="border-t border-line pt-6">
            <Button variant="danger" size="sm" onClick={remove}>
              Eliminar liga
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
