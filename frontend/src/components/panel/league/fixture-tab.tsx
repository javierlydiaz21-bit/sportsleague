'use client';

import { CalendarPlus, Radio } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { byId, groupByRound } from '@/lib/compose';
import { errorMessage, formatDateOnly, isoToLocalParts, localToIso } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Fixture, LiveMatchSummary, Match, Team } from '@/lib/types';
import { MatchRow } from '../../league/match-row';
import { Modal, useToast } from '../../overlay';
import { Button, Card, EmptyState, Field, Input, Notice, Pills, SectionTitle, Select } from '../../ui';
import type { LeagueTabProps } from '../league-manager';
import { StepNavigation, useSetup } from './setup-flow';
import { DayToggles } from './venues-tab';

type Dialog = { kind: 'reschedule' | 'suspend'; match: Match } | { kind: 'create' } | null;

export function FixtureTab({ league }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const [seasonId, setSeasonId] = useState(league.seasons[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(league.categories[0]?.id ?? '');
  const season = league.seasons.find((s) => s.id === seasonId);
  const venueDays = useMemo(() => [...new Set(league.venues.flatMap((v) => v.availableDays))].sort(), [league.venues]);
  const [config, setConfig] = useState({ startDate: '', matchDays: venueDays.length ? venueDays : [6, 0], slotMinutes: 120, minRestDays: 3, doubleRound: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [regenerate, setRegenerate] = useState(false);
  const { refreshProgress } = useSetup();

  const ready = !!seasonId && !!categoryId;
  const { data, reload } = useAsync(async () => {
    if (!ready) return { fixture: undefined as Fixture | undefined, teams: [] as Team[], live: [] as LiveMatchSummary[] };
    const [fixtures, teams, live] = await Promise.all([
      api.get<Fixture[]>(`/seasons/${seasonId}/fixtures?categoryId=${categoryId}`),
      api.get<Team[]>(`/teams?categoryId=${categoryId}`),
      api.get<LiveMatchSummary[]>(`/live/matches?seasonId=${seasonId}&categoryId=${categoryId}`).catch(() => []),
    ]);
    return { fixture: fixtures[0], teams, live };
  }, [api, seasonId, categoryId]);

  const teams = byId(data?.teams ?? []);
  const venues = byId(league.venues);
  const liveMap = new Map((data?.live ?? []).map((m) => [m.matchId, m]));
  const fixture = data?.fixture;

  if (league.seasons.length === 0 || league.categories.length === 0) {
    return (
      <>
        <EmptyState title="Faltan temporada o categoría" description="Crea al menos una temporada y una categoría para programar partidos." />
        <StepNavigation step="calendario" />
      </>
    );
  }

  /** Genera el borrador con la configuración del formulario. Devuelve el borrador o undefined si falló. */
  const runGenerate = async (): Promise<Fixture | undefined> => {
    try {
      const result = await api.post<Fixture>(`/seasons/${seasonId}/fixtures/generate`, {
        categoryId,
        ...(config.startDate ? { startDate: config.startDate } : {}),
        matchDays: config.matchDays,
        slotMinutes: Number(config.slotMinutes),
        minRestDays: Number(config.minRestDays),
        doubleRound: config.doubleRound,
      });
      await reload();
      setRegenerate(false);
      toast.success(`Borrador generado: ${result.totalRounds} jornadas y ${result.matches.length} partidos`);
      for (const warning of result.warnings ?? []) toast.info(warning);
      return result;
    } catch (err) {
      toast.error(errorMessage(err));
      return undefined;
    }
  };

  /** Publica un borrador (asigna árbitros y notifica). Devuelve true si se publicó. */
  const runPublish = async (fixtureId: string): Promise<boolean> => {
    try {
      await api.post(`/fixtures/${fixtureId}/publish`);
      await reload();
      void refreshProgress();
      toast.success('Calendario publicado: se asignan árbitros y se notifica a equipos y aficionados');
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('generate');
    await runGenerate();
    setBusy(null);
  };

  const publish = async () => {
    if (!fixture) return;
    setBusy('publish');
    await runPublish(fixture.id);
    setBusy(null);
  };

  /** Último paso del flujo: genera el borrador (si no hay) con la configuración de arriba y lo publica. */
  const generateAndPublish = async () => {
    setBusy('flow');
    const draft = fixture?.status === 'DRAFT' ? fixture : await runGenerate();
    if (draft) await runPublish(draft.id);
    setBusy(null);
  };

  const discard = async () => {
    if (!fixture || !window.confirm('¿Descartar el borrador del calendario?')) return;
    try {
      await api.del(`/fixtures/${fixture.id}`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const rounds = groupByRound(fixture?.matches ?? []);
  const lastDate = fixture?.matches.reduce((max, m) => (m.scheduledAt > max ? m.scheduledAt : max), '');
  const approved = league.status === 'APPROVED';
  const showGenerator = !fixture || (fixture.status === 'DRAFT' && regenerate);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
          <Pills options={league.seasons.map((s) => ({ value: s.id, label: s.name }))} value={seasonId} onChange={setSeasonId} />
          <Pills options={league.categories.map((c) => ({ value: c.id, label: c.name }))} value={categoryId} onChange={setCategoryId} />
        </div>

        {!approved && (
          <Notice tone="amber" title="La liga aún no está aprobada">
            Podrás generar y publicar el calendario cuando un administrador apruebe la liga.
          </Notice>
        )}

        {showGenerator ? (
          <Card className="p-5">
            <SectionTitle
              title="Generar calendario automáticamente"
              description="Round-robin con localía equilibrada. Respeta los días y horarios de las canchas, la cancha propia de cada equipo y el descanso mínimo."
            />
            <form onSubmit={generate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Fecha de inicio" hint={season ? `Por defecto: ${formatDateOnly(season.startDate)}` : undefined}>
                <Input type="date" value={config.startDate} onChange={(e) => setConfig((c) => ({ ...c, startDate: e.target.value }))} />
              </Field>
              <Field label="Duración de franja (min)" hint="Partido + margen entre partidos">
                <Input type="number" min={30} max={300} value={config.slotMinutes} onChange={(e) => setConfig((c) => ({ ...c, slotMinutes: Number(e.target.value) }))} />
              </Field>
              <Field label="Descanso mínimo (días)">
                <Input type="number" min={0} max={30} value={config.minRestDays} onChange={(e) => setConfig((c) => ({ ...c, minRestDays: Number(e.target.value) }))} />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={config.doubleRound} onChange={(e) => setConfig((c) => ({ ...c, doubleRound: e.target.checked }))} className="h-4 w-4 accent-current" />
                Ida y vuelta
              </label>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <span className="text-[13px] font-medium">Días de juego</span>
                <DayToggles value={config.matchDays} onChange={(matchDays) => setConfig((c) => ({ ...c, matchDays }))} />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" loading={busy === 'generate'} disabled={!approved || league.venues.length === 0}>
                  <CalendarPlus className="h-4 w-4" /> Generar borrador
                </Button>
                {regenerate && (
                  <Button type="button" variant="ghost" onClick={() => setRegenerate(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
              {league.venues.length === 0 && <p className="text-xs text-warn sm:col-span-4">Registra al menos una cancha antes de generar el calendario.</p>}
            </form>
          </Card>
        ) : fixture?.status === 'DRAFT' ? (
          <Notice tone="blue" title={`Borrador · ${fixture.totalRounds} jornadas · ${fixture.matches.length} partidos`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Revisa el calendario{lastDate ? `; termina el ${isoToLocalParts(lastDate).date}` : ''}. Al publicarlo se asignan árbitros y se notifica a todos.</span>
              <span className="flex shrink-0 gap-2">
                <Button size="sm" onClick={publish} loading={busy === 'publish'}>
                  Publicar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setRegenerate(true)}>
                  Regenerar
                </Button>
                <Button size="sm" variant="ghost" onClick={discard}>
                  Descartar
                </Button>
              </span>
            </div>
          </Notice>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Calendario publicado · {fixture?.totalRounds} jornadas · {fixture?.matches.length} partidos
            </p>
            <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: 'create' })} disabled={!approved}>
              <CalendarPlus className="h-4 w-4" /> Agregar partido
            </Button>
          </div>
        )}

        {rounds.map(([round, matches]) => (
          <div key={round}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Jornada {round}</p>
            <Card className="divide-y divide-line overflow-hidden">
              {matches.map((match) => (
                <div key={match.id} className="flex flex-col sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <MatchRow match={match} teams={teams} live={liveMap.get(match.id)} venues={venues} />
                  </div>
                  {fixture?.status === 'PUBLISHED' && (
                    <div className="flex shrink-0 gap-1 px-4 pb-3 sm:pb-0 sm:pl-0">
                      {match.status !== 'FINISHED' && match.status !== 'SUSPENDED' && (
                        <Link
                          href={`/panel/partidos/${match.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-fg hover:bg-surface"
                          title="Abrir el control del partido en vivo"
                        >
                          <Radio className="h-3.5 w-3.5 text-live" /> Control
                        </Link>
                      )}
                      {(match.status === 'SCHEDULED' || match.status === 'SUSPENDED') && (
                        <button type="button" onClick={() => setDialog({ kind: 'reschedule', match })} className="h-8 rounded-lg px-2 text-xs text-muted hover:bg-surface hover:text-fg">
                          Reprogramar
                        </button>
                      )}
                      {(match.status === 'SCHEDULED' || match.status === 'LIVE') && (
                        <button type="button" onClick={() => setDialog({ kind: 'suspend', match })} className="h-8 rounded-lg px-2 text-xs text-muted hover:bg-surface hover:text-fg">
                          Suspender
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </div>
        ))}

        <MatchDialogs
          dialog={dialog}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void reload();
          }}
          league={league}
          seasonId={seasonId}
          categoryId={categoryId}
          teams={data?.teams ?? []}
        />
      </div>
      <StepNavigation
        step="calendario"
        finalAction={
          fixture?.status === 'PUBLISHED'
            ? undefined
            : {
                label: fixture?.status === 'DRAFT' ? 'Publicar calendario' : 'Generar y publicar calendario',
                onClick: generateAndPublish,
                loading: busy === 'flow',
              }
        }
        finalDone={<p className="text-sm font-medium text-brand">Calendario publicado: la liga está en marcha.</p>}
      />
    </>
  );
}

function MatchDialogs({
  dialog,
  onClose,
  onDone,
  league,
  seasonId,
  categoryId,
  teams,
}: {
  dialog: Dialog;
  onClose: () => void;
  onDone: () => void;
  league: LeagueTabProps['league'];
  seasonId: string;
  categoryId: string;
  teams: Team[];
}) {
  const { api } = useAuth();
  const toast = useToast();
  const initial = dialog && dialog.kind !== 'create' ? isoToLocalParts(dialog.match.scheduledAt) : { date: '', time: '15:00' };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [venueId, setVenueId] = useState(dialog && dialog.kind !== 'create' ? (dialog.match.venueId ?? '') : '');
  const [reason, setReason] = useState('');
  const [homeTeamId, setHome] = useState('');
  const [awayTeamId, setAway] = useState('');
  const [busy, setBusy] = useState(false);
  const key = dialog ? (dialog.kind === 'create' ? 'create' : `${dialog.kind}-${dialog.match.id}`) : 'none';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    // Reinicia el formulario cada vez que se abre un diálogo distinto.
    setLastKey(key);
    setDate(initial.date);
    setTime(initial.time);
    setVenueId(dialog && dialog.kind !== 'create' ? (dialog.match.venueId ?? '') : '');
    setReason('');
  }

  const submit = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.kind === 'reschedule') {
        await api.put(`/matches/${dialog.match.id}/venue`, { scheduledAt: localToIso(date, time), ...(venueId ? { venueId } : {}) });
        toast.success('Partido reprogramado; se notificó el cambio');
      } else if (dialog.kind === 'suspend') {
        await api.patch(`/matches/${dialog.match.id}/status`, { status: 'SUSPENDED', reason });
        toast.success('Partido suspendido');
      } else {
        await api.post('/matches', {
          seasonId,
          categoryId,
          homeTeamId,
          awayTeamId,
          scheduledAt: localToIso(date, time),
          ...(venueId ? { venueId } : {}),
        });
        toast.success('Partido creado y publicado');
      }
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const titles = { reschedule: 'Reprogramar partido', suspend: 'Suspender partido', create: 'Agregar partido' };
  return (
    <Modal
      open={!!dialog}
      onClose={onClose}
      title={dialog ? titles[dialog.kind] : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy} variant={dialog?.kind === 'suspend' ? 'danger' : 'primary'}>
            {dialog?.kind === 'suspend' ? 'Suspender' : 'Guardar'}
          </Button>
        </>
      }
    >
      {dialog?.kind === 'suspend' ? (
        <Field label="Motivo" hint="Se notificará a los equipos y aficionados.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lluvia, cancha no disponible..." />
        </Field>
      ) : (
        <div className="space-y-4">
          {dialog?.kind === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Local">
                <Select value={homeTeamId} onChange={(e) => setHome(e.target.value)}>
                  <option value="">Selecciona</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Visitante">
                <Select value={awayTeamId} onChange={(e) => setAway(e.target.value)}>
                  <option value="">Selecciona</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Hora">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Cancha">
            <Select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
              <option value="">Sin cancha</option>
              {league.venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.zone}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  );
}
