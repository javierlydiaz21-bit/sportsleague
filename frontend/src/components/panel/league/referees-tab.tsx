'use client';

import { Plus, Trash2, Wand2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { WEEKDAYS, WEEKDAYS_SHORT, errorMessage, formatDateTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Assignment, AvailabilityWindow, Referee, ScheduledMatchProjection } from '@/lib/types';
import { useToast } from '../../overlay';
import { Badge, Button, Card, EmptyState, Field, Input, SectionTitle, Select, Table, Td, Th, cn } from '../../ui';
import type { LeagueTabProps } from '../league-manager';
import { StepNavigation, useSetup, useUnsavedChanges } from './setup-flow';

const STATUS = {
  ASSIGNED: { label: 'Asignado', tone: 'blue' },
  CONFIRMED: { label: 'Confirmado', tone: 'green' },
  DECLINED: { label: 'Rechazado', tone: 'red' },
} as const;

interface AssignmentRow {
  match: ScheduledMatchProjection;
  assignment: (Assignment & { referee: { id: string; name: string; email: string; zone: string } }) | null;
}

export function AvailabilityEditor({ value, onChange }: { value: AvailabilityWindow[]; onChange: (next: AvailabilityWindow[]) => void }) {
  const update = (index: number, patch: Partial<AvailabilityWindow>) => onChange(value.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  return (
    <div className="space-y-2">
      {value.map((window, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select value={window.dayOfWeek} onChange={(e) => update(index, { dayOfWeek: Number(e.target.value) })} className="w-32">
            {WEEKDAYS.map((day, d) => (
              <option key={day} value={d}>
                {day}
              </option>
            ))}
          </Select>
          <Input type="time" value={window.startTime} onChange={(e) => update(index, { startTime: e.target.value })} />
          <Input type="time" value={window.endTime} onChange={(e) => update(index, { endTime: e.target.value })} />
          <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="rounded-md p-2 text-subtle hover:text-live" aria-label="Quitar franja">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { dayOfWeek: 6, startTime: '08:00', endTime: '18:00' }])}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar franja
      </button>
    </div>
  );
}

export function RefereesTab({ league }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const { data: referees, reload } = useAsync(() => api.get<Referee[]>(`/referees?leagueId=${league.id}`), [api, league.id]);
  const { data: rows, reload: reloadAssignments } = useAsync(() => api.get<AssignmentRow[]>(`/assignments?leagueId=${league.id}`), [api, league.id]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', zone: '', categoriesCertified: [] as string[] });
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([
    { dayOfWeek: 6, startTime: '07:00', endTime: '20:00' },
    { dayOfWeek: 0, startTime: '07:00', endTime: '20:00' },
  ]);
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, string>>({});
  const { refreshProgress } = useSetup();
  const markSaved = useUnsavedChanges({ form, availability });

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('create');
    try {
      await api.post('/referees', {
        name: form.name,
        email: form.email,
        zone: form.zone,
        leagueId: league.id,
        ...(form.phone ? { phone: form.phone } : {}),
        categoriesCertified: form.categoriesCertified,
        availability,
      });
      setForm({ name: '', email: '', phone: '', zone: '', categoriesCertified: [] });
      markSaved();
      await reload();
      void refreshProgress();
      toast.success('Árbitro registrado. Si crea su cuenta con ese correo, verá sus partidos.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (referee: Referee) => {
    if (!window.confirm(`¿Eliminar a ${referee.name}? Se quitarán sus asignaciones.`)) return;
    try {
      await api.del(`/referees/${referee.id}`);
      await Promise.all([reload(), reloadAssignments()]);
      void refreshProgress();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const autoAssign = async () => {
    setBusy('auto');
    try {
      const result = await api.post<{ assigned: number; unassigned: number }>('/assignments/auto', { leagueId: league.id });
      await reloadAssignments();
      toast.success(`Asignación automática: ${result.assigned} asignados, ${result.unassigned} sin árbitro disponible`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const assign = async (matchId: string) => {
    const refereeId = manual[matchId];
    if (!refereeId) return;
    setBusy(matchId);
    try {
      await api.post('/assignments', { matchId, refereeId });
      await reloadAssignments();
      toast.success('Árbitro asignado');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const upcoming = (rows ?? []).filter((row) => row.match.status === 'SCHEDULED');
  const unassigned = upcoming.filter((row) => !row.assignment).length;

  return (
    <>
      <div className="space-y-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div>
            <SectionTitle title="Árbitros" description="El Referee Service los asigna automáticamente cuando se publica cada jornada." />
            {referees && referees.length === 0 ? (
              <EmptyState title="Aún no hay árbitros" description="Registra árbitros con su zona y disponibilidad." />
            ) : (
              <Card className="divide-y divide-line">
                {(referees ?? []).map((referee) => (
                  <div key={referee.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {referee.name} <span className="font-normal text-muted">· Zona {referee.zone}</span>
                      </p>
                      <p className="truncate text-xs text-muted">{referee.email}</p>
                      <p className="mt-1 text-xs text-muted">
                        {referee.availability.map((w) => `${WEEKDAYS_SHORT[w.dayOfWeek]} ${w.startTime}–${w.endTime}`).join(' · ') || 'Sin disponibilidad declarada'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{referee._count?.assignments ?? 0} partidos</Badge>
                      <button type="button" onClick={() => remove(referee)} className="rounded-md p-1.5 text-subtle hover:bg-live-soft hover:text-live" aria-label="Eliminar árbitro">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
          <form onSubmit={create} className="space-y-4">
            <SectionTitle title="Registrar árbitro" />
            <Field label="Nombre">
              <Input required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Correo" hint="Con este correo el árbitro podrá ver y operar sus partidos.">
              <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zona">
                <Input required value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="Centro" />
              </Field>
              <Field label="Teléfono">
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
            </div>
            {league.categories.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[13px] font-medium">Categorías certificadas</span>
                <div className="flex flex-wrap gap-1.5">
                  {league.categories.map((category) => {
                    const active = form.categoriesCertified.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            categoriesCertified: active ? f.categoriesCertified.filter((id) => id !== category.id) : [...f.categoriesCertified, category.id],
                          }))
                        }
                        className={cn('rounded-full border px-3 py-1 text-[13px]', active ? 'border-fg bg-fg text-bg' : 'border-line-strong text-muted')}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted">Sin selección = puede pitar todas las categorías.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-[13px] font-medium">Disponibilidad</span>
              <AvailabilityEditor value={availability} onChange={setAvailability} />
            </div>
            <Button type="submit" loading={busy === 'create'}>
              Registrar árbitro
            </Button>
          </form>
        </div>

        <div>
          <SectionTitle
            title="Asignaciones"
            description={unassigned > 0 ? `${unassigned} partido(s) próximos sin árbitro.` : 'Partidos publicados y su árbitro.'}
            action={
              <Button variant="secondary" size="sm" onClick={autoAssign} loading={busy === 'auto'}>
                <Wand2 className="h-4 w-4" /> Asignar pendientes
              </Button>
            }
          />
          {rows && rows.length === 0 ? (
            <EmptyState title="Sin partidos publicados" description="Al publicar el calendario, cada jornada se asigna automáticamente." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Partido</Th>
                  <Th>Fecha</Th>
                  <Th>Cancha</Th>
                  <Th>Árbitro</Th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map(({ match, assignment }) => (
                  <tr key={match.matchId}>
                    <Td>
                      <p className="font-medium">{match.label}</p>
                      <p className="text-xs text-muted">Jornada {match.round}</p>
                    </Td>
                    <Td className="text-muted">{formatDateTime(match.scheduledAt)}</Td>
                    <Td className="text-muted">
                      {match.venueName ?? '—'}
                      {match.venueZone ? <span className="text-subtle"> · {match.venueZone}</span> : null}
                    </Td>
                    <Td>
                      {assignment ? (
                        <span className="flex items-center gap-2">
                          {assignment.referee.name}
                          <Badge tone={STATUS[assignment.status].tone}>{STATUS[assignment.status].label}</Badge>
                        </span>
                      ) : match.status !== 'SCHEDULED' ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Select className="h-8 w-44 text-xs" value={manual[match.matchId] ?? ''} onChange={(e) => setManual((m) => ({ ...m, [match.matchId]: e.target.value }))}>
                            <option value="">Sin árbitro</option>
                            {(referees ?? []).map((referee) => (
                              <option key={referee.id} value={referee.id}>
                                {referee.name}
                              </option>
                            ))}
                          </Select>
                          <Button size="sm" variant="secondary" onClick={() => assign(match.matchId)} loading={busy === match.matchId} disabled={!manual[match.matchId]}>
                            Asignar
                          </Button>
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
      <StepNavigation step="arbitros" />
    </>
  );
}
