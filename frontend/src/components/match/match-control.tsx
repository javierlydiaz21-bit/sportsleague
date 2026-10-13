'use client';

import { ArrowLeftRight, Minus, Play, Plus, Square } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage, eventLabel, playerName } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import { useLiveMatch } from '@/lib/live';
import type { EventType, LeagueDetail, LiveSnapshot, Match, MatchEvent, Player, Sport, Team } from '@/lib/types';
import { Modal, useToast } from '../overlay';
import { RequireAuth } from '../require-auth';
import { Button, Card, EmptyState, Field, Input, Notice, PageSpinner, Select, TeamBadge, Textarea, cn } from '../ui';
import { EventIcon, Scoreboard, Timeline } from './match-parts';

interface ControlData {
  match: Match;
  teams: Team[];
  players: Player[];
  league: LeagueDetail | null;
  snapshot: LiveSnapshot;
}

interface Draft {
  type: EventType;
  teamId: string;
  value: number;
}

function elapsedMinute(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000) + 1);
}

function ControlPanel({ data, onReload }: { data: ControlData; onReload: () => void }) {
  const { api, user } = useAuth();
  const toast = useToast();
  const { match, teams, players, league } = data;
  const { snapshot, setSnapshot, connected, lastEventId } = useLiveMatch(match.id, data.snapshot);
  const sport: Sport = league?.sport ?? 'FOOTBALL';
  const home = teams.find((t) => t.id === match.homeTeamId);
  const away = teams.find((t) => t.id === match.awayTeamId);
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const [minute, setMinute] = useState(elapsedMinute(snapshot.startedAt));
  const [manualMinute, setManualMinute] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [playerInId, setPlayerInId] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [attendance, setAttendance] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // El reloj avanza solo mientras el partido está en curso (se puede ajustar a mano).
  useEffect(() => {
    if (snapshot.status !== 'LIVE' || manualMinute) return;
    setMinute(elapsedMinute(snapshot.startedAt));
    const id = setInterval(() => setMinute(elapsedMinute(snapshot.startedAt)), 15_000);
    return () => clearInterval(id);
  }, [snapshot.status, snapshot.startedAt, manualMinute]);

  const isOwner = user?.role === 'ADMIN' || user?.id === match.ownerId;
  const canEdit = snapshot.status === 'LIVE' || (snapshot.status === 'FINISHED' && isOwner);

  const start = async () => {
    setBusy('start');
    try {
      setSnapshot(await api.post<LiveSnapshot>(`/matches/${match.id}/start`));
      toast.success('Partido iniciado: los espectadores ya lo ven en vivo');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const openDraft = (type: EventType, teamId: string, value = 1) => {
    setDraft({ type, teamId, value });
    setPlayerId('');
    setPlayerInId('');
  };

  const submitEvent = async () => {
    if (!draft) return;
    setBusy('event');
    try {
      await api.post(`/matches/${match.id}/events`, {
        type: draft.type,
        teamId: draft.teamId,
        minute,
        ...(draft.type === 'GOAL' && draft.value > 1 ? { value: draft.value } : {}),
        ...(playerId ? { playerId } : {}),
        ...(draft.type === 'SUBSTITUTION' && playerInId ? { playerInId } : {}),
      });
      setDraft(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const removeEvent = async (event: MatchEvent) => {
    if (!window.confirm(`¿Eliminar "${eventLabel(event.type, sport, event.value)}" del minuto ${event.minute}?`)) return;
    try {
      await api.del(`/matches/${match.id}/events/${event.id}`);
      toast.info(snapshot.status === 'FINISHED' ? 'Acta corregida: la tabla se recalcula automáticamente' : 'Evento eliminado');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const finish = async () => {
    setBusy('finish');
    try {
      setSnapshot(
        await api.post<LiveSnapshot>(`/matches/${match.id}/complete`, {
          ...(attendance ? { attendance: Number(attendance) } : {}),
          ...(notes ? { notes } : {}),
        }),
      );
      setFinishing(false);
      toast.success('Acta cerrada: se publicó match.completed y la tabla se recalcula');
      onReload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const draftTeam = draft ? (draft.teamId === match.homeTeamId ? home : away) : undefined;
  const roster = draft ? players.filter((p) => p.teamId === draft.teamId) : [];
  const scoreButtons = sport === 'BASKETBALL' ? [1, 2, 3] : [1];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between text-sm">
        <Link href={`/partidos/${match.id}`} className="text-muted hover:text-fg">
          Ver como espectador →
        </Link>
        {league && <span className="text-muted">{league.name}</span>}
      </div>

      <Scoreboard
        home={home}
        away={away}
        score={snapshot.score}
        status={snapshot.status}
        scheduledAt={match.scheduledAt}
        venueName={league?.venues.find((v) => v.id === match.venueId)?.name}
        viewers={snapshot.viewers}
        connected={connected}
        highlight={lastEventId}
        subtitle={`Control del partido · Jornada ${match.round}`}
      />

      {match.status === 'SUSPENDED' && <Notice tone="amber" title="Partido suspendido">{match.suspensionReason}</Notice>}

      {snapshot.status === 'NOT_STARTED' && match.status !== 'SUSPENDED' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Button size="lg" onClick={start} loading={busy === 'start'}>
            <Play className="h-4 w-4" /> Iniciar partido
          </Button>
          <p className="text-xs text-muted">Al iniciar, el marcador queda en vivo para todos los espectadores.</p>
        </div>
      )}

      {snapshot.status === 'LIVE' && (
        <Card className="p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="text-sm text-muted">Minuto</span>
            <Button variant="secondary" size="sm" onClick={() => { setManualMinute(true); setMinute((m) => Math.max(0, m - 1)); }} aria-label="Restar minuto">
              <Minus className="h-4 w-4" />
            </Button>
            <div className="w-20">
              <Input
                type="number"
                className="tabular text-center text-lg font-semibold"
                value={minute}
                min={0}
                max={200}
                aria-label="Minuto del partido"
                onChange={(e) => {
                  setManualMinute(true);
                  setMinute(Number(e.target.value));
                }}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setManualMinute(true); setMinute((m) => Math.min(200, m + 1)); }} aria-label="Sumar minuto">
              <Plus className="h-4 w-4" />
            </Button>
            {manualMinute && (
              <button type="button" className="text-xs text-muted underline" onClick={() => setManualMinute(false)}>
                Reloj automático
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[home, away].map((team) =>
              team ? (
                <div key={team.id} className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <TeamBadge name={team.name} color={team.color} size="sm" /> {team.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {scoreButtons.map((value) => (
                      <Button key={value} variant="brand" onClick={() => openDraft('GOAL', team.id, value)} className={cn(scoreButtons.length === 3 && value === 3 && 'col-span-2')}>
                        {eventLabel('GOAL', sport, value)}
                      </Button>
                    ))}
                    <Button variant="secondary" onClick={() => openDraft('YELLOW_CARD', team.id)}>
                      <EventIcon type="YELLOW_CARD" /> Amarilla
                    </Button>
                    <Button variant="secondary" onClick={() => openDraft('RED_CARD', team.id)}>
                      <EventIcon type="RED_CARD" /> Roja
                    </Button>
                    <Button variant="secondary" onClick={() => openDraft('SUBSTITUTION', team.id)} className="col-span-2">
                      <ArrowLeftRight className="h-4 w-4" /> Sustitución
                    </Button>
                  </div>
                </div>
              ) : null,
            )}
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="danger" onClick={() => setFinishing(true)}>
              <Square className="h-4 w-4" /> Finalizar partido
            </Button>
          </div>
        </Card>
      )}

      {snapshot.status === 'FINISHED' && (
        <Notice tone="green" title={`Partido finalizado · acta versión ${snapshot.version}`}>
          {isOwner
            ? 'Como organizador puedes corregir el acta eliminando eventos o agregando los que faltaron; cada corrección republica el resultado y la tabla se recalcula de forma idempotente.'
            : 'El acta quedó cerrada. Solo el organizador puede corregirla.'}
          {isOwner && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[home, away].map((team) =>
                team ? (
                  <Button key={team.id} size="sm" variant="secondary" onClick={() => openDraft('GOAL', team.id)}>
                    + {eventLabel('GOAL', sport)} {team.name}
                  </Button>
                ) : null,
              )}
            </div>
          )}
        </Notice>
      )}

      <Card className="px-4 sm:px-6">
        <p className="pt-4 text-sm font-semibold">Acta del partido</p>
        <Timeline events={snapshot.events} homeTeamId={match.homeTeamId} players={playerMap} sport={sport} onDelete={canEdit ? removeEvent : undefined} />
      </Card>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft ? `${eventLabel(draft.type, sport, draft.value)} · ${draftTeam?.name ?? ''}` : ''}
        description={`Minuto ${minute}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button onClick={submitEvent} loading={busy === 'event'} disabled={draft?.type === 'SUBSTITUTION' && (!playerId || !playerInId)}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={draft?.type === 'SUBSTITUTION' ? 'Sale' : 'Jugador'}>
            <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">{draft?.type === 'SUBSTITUTION' ? 'Selecciona' : 'Sin especificar'}</option>
              {roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.jerseyNumber ?? '–'} · {playerName(p)}
                </option>
              ))}
            </Select>
          </Field>
          {draft?.type === 'SUBSTITUTION' && (
            <Field label="Entra">
              <Select value={playerInId} onChange={(e) => setPlayerInId(e.target.value)}>
                <option value="">Selecciona</option>
                {roster
                  .filter((p) => p.id !== playerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jerseyNumber ?? '–'} · {playerName(p)}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          {snapshot.status === 'FINISHED' && (
            <Field label="Minuto del evento">
              <Input type="number" min={0} max={200} value={minute} onChange={(e) => setMinute(Number(e.target.value))} />
            </Field>
          )}
        </div>
      </Modal>

      <Modal
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Finalizar partido"
        description={`Resultado final: ${home?.name ?? 'Local'} ${snapshot.score.home} - ${snapshot.score.away} ${away?.name ?? 'Visitante'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFinishing(false)}>
              Cancelar
            </Button>
            <Button onClick={finish} loading={busy === 'finish'}>
              Cerrar acta
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Asistencia (opcional)" hint="Si no la reportas, Analytics usa el pico de espectadores conectados.">
            <Input type="number" min={0} value={attendance} onChange={(e) => setAttendance(e.target.value)} />
          </Field>
          <Field label="Observaciones (opcional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Loader({ id }: { id: string }) {
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(async (): Promise<ControlData> => {
    const match = await api.get<Match>(`/matches/${id}`);
    const teamIds = `${match.homeTeamId},${match.awayTeamId}`;
    const [teams, players, league, snapshot] = await Promise.all([
      api.get<Team[]>(`/teams?ids=${teamIds}`),
      api.get<Player[]>(`/players?teamIds=${teamIds}`),
      api.get<LeagueDetail>(`/leagues/${match.leagueId}`).catch(() => null),
      api.get<LiveSnapshot>(`/matches/${id}/live`),
    ]);
    return { match, teams, players, league, snapshot };
  }, [api, id]);

  if (loading && !data) return <PageSpinner />;
  if (!data) return <EmptyState className="mt-10" title="No pudimos cargar el partido" description={error ?? undefined} />;
  return <ControlPanel data={data} onReload={() => void reload()} />;
}

export function MatchControl({ id }: { id: string }) {
  return <RequireAuth roles={['ORGANIZER', 'REFEREE', 'ADMIN']}>{() => <Loader id={id} />}</RequireAuth>;
}
