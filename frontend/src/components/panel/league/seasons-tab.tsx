'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage, formatDateOnly } from '@/lib/format';
import { useToast } from '../../overlay';
import { Button, Card, EmptyState, Field, Input, SectionTitle } from '../../ui';
import type { LeagueTabProps } from '../league-manager';
import { StepNavigation, useUnsavedChanges } from './setup-flow';

export function SeasonsTab({ league, reload }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ name: `Apertura ${year}`, year: String(year), startDate: '', endDate: '' });
  const [busy, setBusy] = useState(false);
  const markSaved = useUnsavedChanges(form);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/leagues/${league.id}/seasons`, { ...form, year: Number(form.year) });
      await reload();
      toast.success('Temporada creada');
      setForm((f) => ({ ...f, startDate: '', endDate: '' }));
      markSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <SectionTitle title="Temporadas" description="Cada temporada tiene su propio calendario y su propia tabla de posiciones." />
          {league.seasons.length === 0 ? (
            <EmptyState title="Aún no hay temporadas" description="Crea la primera con el formulario." />
          ) : (
            <Card className="divide-y divide-line">
              {league.seasons.map((season) => (
                <div key={season.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{season.name}</p>
                    <p className="text-xs text-muted">
                      {formatDateOnly(season.startDate)} – {formatDateOnly(season.endDate)}
                    </p>
                  </div>
                  <span className="tabular text-xs text-subtle">{season.year}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <SectionTitle title="Nueva temporada" />
          <Field label="Nombre">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Año">
            <Input type="number" required min={2000} max={2100} value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio">
              <Input type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="Fin">
              <Input type="date" required value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>
          <Button type="submit" loading={busy}>
            Crear temporada
          </Button>
        </form>
      </div>
      <StepNavigation step="temporadas" />
    </>
  );
}
