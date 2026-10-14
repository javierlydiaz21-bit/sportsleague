'use client';

import { Check, Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage, formatDateTime } from '@/lib/format';
import { useToast } from '../../overlay';
import { Button, Card, Field, Input, Notice, SectionTitle, Textarea, cn } from '../../ui';
import type { LeagueTabProps } from '../league-manager';
import { StepNavigation, useSetup, useUnsavedChanges, type StepKey } from './setup-flow';

export function OverviewTab({ league, reload }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { steps: flow, progress, goToStep, confirmLeave } = useSetup();
  const [form, setForm] = useState({ name: league.name, city: league.city ?? '', description: league.description ?? '' });
  const [saving, setSaving] = useState(false);
  const markSaved = useUnsavedChanges(form);
  const dirty = form.name !== league.name || form.city !== (league.city ?? '') || form.description !== (league.description ?? '');

  const done = (key: StepKey) => flow.find((s) => s.key === key)?.done ?? false;
  const steps: { done: boolean; label: string; tab?: StepKey; hint?: string }[] = [
    { done: league.status === 'APPROVED', label: 'Aprobación del administrador', hint: league.status === 'PENDING' ? 'En revisión' : undefined },
    { done: done('temporadas'), label: `Temporada (${league.seasons.length})`, tab: 'temporadas' },
    { done: done('categorias'), label: `Categorías y reglamento (${league.categories.length})`, tab: 'categorias' },
    { done: done('canchas'), label: `Canchas con disponibilidad (${league.venues.length})`, tab: 'canchas' },
    { done: done('equipos'), label: `Equipos inscritos (${progress?.teams ?? '…'})`, tab: 'equipos' },
    { done: done('arbitros'), label: `Árbitros registrados (${progress?.referees ?? '…'})`, tab: 'arbitros' },
    { done: done('calendario'), label: 'Calendario publicado', tab: 'calendario' },
  ];

  /** Guarda «Datos de la liga». Devuelve false (y muestra el error) si no se pudo guardar. */
  const persist = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`/leagues/${league.id}`, form);
      await reload();
      markSaved();
      toast.success('Datos de la liga actualizados');
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    await persist();
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
    <>
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
              {steps.map((step) => {
                const content = (
                  <>
                    {step.done ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <Circle className="h-5 w-5 text-line-strong" />
                    )}
                    <span className={cn('flex-1', step.done ? 'text-muted' : 'font-medium')}>{step.label}</span>
                    {step.hint && <span className="text-xs text-warn">{step.hint}</span>}
                    {step.done && <span className="sr-only"> (completo)</span>}
                  </>
                );
                const tab = step.tab;
                // La aprobación la decide el administrador: se muestra su estado, pero no lleva a ninguna sección.
                return tab ? (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => confirmLeave() && goToStep(tab)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/20"
                  >
                    {content}
                  </button>
                ) : (
                  <div key={step.label} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm">
                    {content}
                  </div>
                );
              })}
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
      {/* Si «Datos de la liga» tiene cambios sin guardar, se guardan antes de avanzar. */}
      <StepNavigation step="resumen" onBeforeNext={async () => !dirty || (await persist())} />
    </>
  );
}
