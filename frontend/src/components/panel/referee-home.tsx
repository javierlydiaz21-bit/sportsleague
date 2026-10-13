'use client';

import { CalendarClock, MapPin, Radio } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { WEEKDAYS_SHORT, errorMessage, formatDateTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Assignment, AvailabilityWindow, Referee, User } from '@/lib/types';
import { useToast } from '../overlay';
import { RequireAuth } from '../require-auth';
import { Badge, Button, Card, EmptyState, Notice, PageHeader, PageSpinner, SectionTitle } from '../ui';
import { AvailabilityEditor } from './league/referees-tab';

const STATUS = {
  ASSIGNED: { label: 'Por confirmar', tone: 'amber' },
  CONFIRMED: { label: 'Confirmado', tone: 'green' },
  DECLINED: { label: 'Rechazado', tone: 'red' },
} as const;

function ProfileAvailability({ profile, onSaved }: { profile: Referee; onSaved: () => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState<AvailabilityWindow[]>(() =>
    profile.availability.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
  );
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const availability = value.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
      await api.put(`/referees/${profile.id}/availability`, { availability });
      toast.success('Disponibilidad actualizada');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-sm font-medium">Zona {profile.zone}</p>
        <p className="text-xs text-muted">
          Disponibilidad actual: {profile.availability.map((w) => `${WEEKDAYS_SHORT[w.dayOfWeek]} ${w.startTime}–${w.endTime}`).join(' · ') || 'sin franjas'}
        </p>
      </div>
      <AvailabilityEditor value={value} onChange={setValue} />
      <Button size="sm" variant="secondary" onClick={save} loading={busy}>
        Guardar disponibilidad
      </Button>
    </Card>
  );
}

function RefereeDashboard({ user }: { user: User }) {
  const { api } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [assignments, profiles] = await Promise.all([api.get<Assignment[]>('/assignments/mine'), api.get<Referee[]>('/referees/me')]);
    return { assignments, profiles };
  }, [api]);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <PageSpinner />;
  const now = Date.now();
  const assignments = data?.assignments ?? [];
  const upcoming = assignments.filter((a) => new Date(a.scheduledAt).getTime() > now - 3 * 3600_000 && a.match?.status !== 'FINISHED');
  const past = assignments.filter((a) => !upcoming.includes(a));

  const respond = async (assignment: Assignment, confirmed: boolean) => {
    setBusy(assignment.id);
    try {
      await api.put(`/assignments/${assignment.id}/confirm`, { confirmed });
      await reload();
      toast.success(confirmed ? 'Partido confirmado' : 'Partido rechazado: el sistema buscará otro árbitro');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader title="Mis partidos" description="Partidos asignados automáticamente según tu disponibilidad, zona y categoría certificada." />
      {data?.profiles.length === 0 && (
        <Notice tone="amber" title="Aún no estás registrado como árbitro en ninguna liga">
          Pide al organizador que te registre con el correo <strong>{user.email}</strong>. Tus asignaciones aparecerán aquí.
        </Notice>
      )}

      <section>
        <SectionTitle title="Próximos" />
        {upcoming.length === 0 ? (
          <EmptyState title="No tienes partidos próximos" />
        ) : (
          <div className="space-y-3">
            {upcoming.map((assignment) => (
              <Card key={assignment.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{assignment.match?.label ?? 'Partido'}</p>
                    <Badge tone={STATUS[assignment.status].tone}>{STATUS[assignment.status].label}</Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> {formatDateTime(assignment.scheduledAt)}
                    </span>
                    {assignment.match?.venueName && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {assignment.match.venueName}
                      </span>
                    )}
                    {assignment.match?.leagueName && <span>{assignment.match.leagueName}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  {assignment.status === 'ASSIGNED' && (
                    <>
                      <Button size="sm" onClick={() => respond(assignment, true)} loading={busy === assignment.id}>
                        Confirmar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => respond(assignment, false)}>
                        Rechazar
                      </Button>
                    </>
                  )}
                  {assignment.status !== 'DECLINED' && (
                    <Link
                      href={`/panel/partidos/${assignment.matchId}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium hover:bg-surface"
                    >
                      <Radio className="h-3.5 w-3.5 text-live" /> Control en vivo
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <SectionTitle title="Anteriores" />
          <Card className="divide-y divide-line">
            {past.map((assignment) => (
              <Link key={assignment.id} href={`/partidos/${assignment.matchId}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface">
                <span>{assignment.match?.label ?? 'Partido'}</span>
                <span className="text-xs text-muted">{formatDateTime(assignment.scheduledAt)}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {data && data.profiles.length > 0 && (
        <section>
          <SectionTitle title="Mi disponibilidad" description="El Referee Service solo te asigna partidos dentro de estas franjas." />
          <div className="grid gap-3 lg:grid-cols-2">
            {data.profiles.map((profile) => (
              <ProfileAvailability key={profile.id} profile={profile} onSaved={() => void reload()} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function RefereeHome() {
  return <RequireAuth roles={['REFEREE', 'ADMIN']}>{(user) => <RefereeDashboard user={user} />}</RequireAuth>;
}
