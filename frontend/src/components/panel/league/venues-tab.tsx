'use client';

import { MapPin, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { WEEKDAYS_SHORT, errorMessage } from '@/lib/format';
import { useToast } from '../../overlay';
import { Button, Card, EmptyState, Field, Input, SectionTitle, cn } from '../../ui';
import type { LeagueTabProps } from '../league-manager';
import { StepNavigation, useUnsavedChanges } from './setup-flow';

export function DayToggles({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS_SHORT.map((label, day) => {
        const active = value.includes(day);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(active ? value.filter((d) => d !== day) : [...value, day].sort())}
            className={cn(
              'h-8 w-11 rounded-lg border text-[13px] transition',
              active ? 'border-fg bg-fg text-bg' : 'border-line-strong text-muted hover:text-fg',
            )}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function VenuesTab({ league, reload }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', zone: '', address: '', availableDays: [6, 0], openTime: '08:00', closeTime: '18:00' });
  const [busy, setBusy] = useState(false);
  const markSaved = useUnsavedChanges(form);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.availableDays.length === 0) return toast.error('Selecciona al menos un día disponible');
    setBusy(true);
    try {
      await api.post(`/leagues/${league.id}/venues`, { ...form, address: form.address || undefined });
      await reload();
      setForm((f) => ({ ...f, name: '', address: '' }));
      markSaved();
      toast.success('Cancha registrada');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cancha?')) return;
    try {
      await api.del(`/venues/${id}`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <SectionTitle
            title="Canchas"
            description="El Fixture Service programa los partidos solo en los días y horarios disponibles. La zona se usa para asignar árbitros cercanos."
          />
          {league.venues.length === 0 ? (
            <EmptyState title="Aún no hay canchas" description="Registra al menos una para poder generar el calendario." />
          ) : (
            <Card className="divide-y divide-line">
              {league.venues.map((venue) => (
                <div key={venue.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{venue.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Zona {venue.zone}
                      </span>
                      <span>{venue.availableDays.map((d) => WEEKDAYS_SHORT[d]).join(', ')}</span>
                      <span className="tabular">
                        {venue.openTime} – {venue.closeTime}
                      </span>
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(venue.id)} className="rounded-md p-1.5 text-subtle hover:bg-live-soft hover:text-live" aria-label="Eliminar cancha">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </Card>
          )}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <SectionTitle title="Nueva cancha" />
          <Field label="Nombre">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Estadio Municipal" />
          </Field>
          <Field label="Zona" hint="Ej.: Norte, Centro, Sur.">
            <Input required value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} />
          </Field>
          <Field label="Dirección">
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          <div className="space-y-1.5">
            <span className="text-[13px] font-medium">Días disponibles</span>
            <DayToggles value={form.availableDays} onChange={(availableDays) => setForm((f) => ({ ...f, availableDays }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Abre">
              <Input type="time" required value={form.openTime} onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))} />
            </Field>
            <Field label="Cierra">
              <Input type="time" required value={form.closeTime} onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))} />
            </Field>
          </div>
          <Button type="submit" loading={busy}>
            Registrar cancha
          </Button>
        </form>
      </div>
      <StepNavigation step="canchas" />
    </>
  );
}
