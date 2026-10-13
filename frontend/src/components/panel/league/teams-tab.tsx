'use client';

import { RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage, formatDateOnly, playerName } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Player, Team } from '@/lib/types';
import { Modal, useToast } from '../../overlay';
import { Badge, Button, Card, EmptyState, Field, Input, Notice, Pills, SectionTitle, Select, Table, TeamBadge, Td, Textarea, Th, cn } from '../../ui';
import type { LeagueTabProps } from '../league-manager';

const ELIGIBILITY = {
  ELIGIBLE: { label: 'Habilitado', tone: 'green' },
  INELIGIBLE: { label: 'No elegible', tone: 'red' },
  PENDING: { label: 'Pendiente', tone: 'amber' },
} as const;

/** Convierte líneas "Nombre;Apellido;AAAA-MM-DD;Número;Posición" en jugadores. */
function parseBulk(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [firstName, lastName, birthDate, jersey, position] = line.split(/[;,\t]/).map((part) => part?.trim());
      return {
        firstName,
        lastName,
        birthDate,
        ...(jersey ? { jerseyNumber: Number(jersey) } : {}),
        ...(position ? { position } : {}),
      };
    });
}

function Roster({ team, onChanged }: { team: Team; onChanged: () => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const { data: players, reload } = useAsync(() => api.get<Player[]>(`/teams/${team.id}/players`), [api, team.id]);
  const [form, setForm] = useState({ firstName: '', lastName: '', birthDate: '', jerseyNumber: '', position: '', documentId: '' });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const player = await api.post<Player>(`/teams/${team.id}/players`, {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        ...(form.jerseyNumber ? { jerseyNumber: Number(form.jerseyNumber) } : {}),
        ...(form.position ? { position: form.position } : {}),
        ...(form.documentId ? { documentId: form.documentId } : {}),
      });
      setForm({ firstName: '', lastName: '', birthDate: '', jerseyNumber: '', position: '', documentId: '' });
      await reload();
      onChanged();
      if (player.eligibilityStatus === 'INELIGIBLE') toast.error(`Jugador inscrito, pero no elegible: ${player.eligibilityNote}`);
      else toast.success('Jugador inscrito');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const importBulk = async () => {
    const list = parseBulk(bulk);
    if (list.length === 0) return;
    setBusy(true);
    try {
      await api.post(`/teams/${team.id}/players/bulk`, { players: list });
      setBulk('');
      setBulkOpen(false);
      await reload();
      onChanged();
      toast.success(`${list.length} jugadores inscritos`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revalidate = async (player: Player) => {
    try {
      const updated = await api.put<Player>(`/players/${player.id}/eligibility`, {});
      await reload();
      toast.info(updated.eligibilityNote ?? 'Elegibilidad revalidada');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (player: Player) => {
    if (!window.confirm(`¿Dar de baja a ${playerName(player)}?`)) return;
    try {
      await api.del(`/players/${player.id}`);
      await reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {players && players.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th className="w-12 text-center">#</Th>
              <Th>Jugador</Th>
              <Th>Nacimiento</Th>
              <Th>Elegibilidad</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <Td className="tabular text-center text-muted">{player.jerseyNumber ?? '–'}</Td>
                <Td>
                  <p className="font-medium">{playerName(player)}</p>
                  <p className="text-xs text-muted">{[player.position, player.documentId].filter(Boolean).join(' · ')}</p>
                </Td>
                <Td className="text-muted">{formatDateOnly(player.birthDate)}</Td>
                <Td>
                  <span title={player.eligibilityNote ?? ''}>
                    <Badge tone={ELIGIBILITY[player.eligibilityStatus].tone}>{ELIGIBILITY[player.eligibilityStatus].label}</Badge>
                  </span>
                </Td>
                <Td className="text-right">
                  <button type="button" onClick={() => revalidate(player)} className="rounded-md p-1.5 text-subtle hover:bg-surface hover:text-fg" title="Revalidar elegibilidad">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(player)} className="rounded-md p-1.5 text-subtle hover:bg-live-soft hover:text-live" title="Dar de baja">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-muted">Este equipo aún no tiene jugadores.</p>
      )}

      <form onSubmit={add} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-6">
        <Field label="Nombre" className="sm:col-span-2">
          <Input required minLength={2} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        </Field>
        <Field label="Apellido" className="sm:col-span-2">
          <Input required minLength={2} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        </Field>
        <Field label="Nacimiento" className="sm:col-span-2">
          <Input type="date" required value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        </Field>
        <Field label="Número">
          <Input type="number" min={0} max={99} value={form.jerseyNumber} onChange={(e) => setForm((f) => ({ ...f, jerseyNumber: e.target.value }))} />
        </Field>
        <Field label="Posición" className="sm:col-span-2">
          <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
        </Field>
        <Field label="Documento" className="sm:col-span-2">
          <Input value={form.documentId} onChange={(e) => setForm((f) => ({ ...f, documentId: e.target.value }))} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" size="md" loading={busy} className="w-full">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="sm:col-span-6">
          <button type="button" className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline" onClick={() => setBulkOpen(true)}>
            Inscribir varios jugadores a la vez
          </button>
        </div>
      </form>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`Inscripción masiva · ${team.name}`}
        description="Una línea por jugador: Nombre; Apellido; AAAA-MM-DD; Número; Posición. La elegibilidad se valida automáticamente."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={importBulk} loading={busy}>
              Inscribir {parseBulk(bulk).length || ''}
            </Button>
          </>
        }
      >
        <Textarea
          className="min-h-48 font-mono text-xs"
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={'Juan;Pérez;2001-04-12;9;Delantero\nCarlos;Gómez;1999-11-02;1;Arquero'}
        />
      </Modal>
    </div>
  );
}

export function TeamsTab({ league }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState(league.categories[0]?.id ?? '');
  const { data: teams, reload } = useAsync(
    () => (categoryId ? api.get<Team[]>(`/teams?categoryId=${categoryId}`) : Promise.resolve([] as Team[])),
    [api, categoryId],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', coachName: '', contactEmail: '', homeVenueId: '' });
  const [busy, setBusy] = useState(false);

  if (league.categories.length === 0) {
    return <EmptyState title="Primero crea una categoría" description="Los equipos se inscriben dentro de una categoría." />;
  }
  const category = league.categories.find((c) => c.id === categoryId);
  const selectedTeam = teams?.find((t) => t.id === selected);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const team = await api.post<Team>('/teams', {
        categoryId,
        name: form.name,
        ...(form.coachName ? { coachName: form.coachName } : {}),
        ...(form.contactEmail ? { contactEmail: form.contactEmail } : {}),
        ...(form.homeVenueId ? { homeVenueId: form.homeVenueId } : {}),
      });
      setForm({ name: '', coachName: '', contactEmail: '', homeVenueId: '' });
      await reload();
      setSelected(team.id);
      toast.success('Equipo inscrito');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async (team: Team) => {
    if (!window.confirm(`¿Eliminar el equipo ${team.name} y su plantilla?`)) return;
    try {
      await api.del(`/teams/${team.id}`);
      setSelected(null);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <Pills options={league.categories.map((c) => ({ value: c.id, label: c.name }))} value={categoryId} onChange={(id) => { setCategoryId(id); setSelected(null); }} />
      {category && (category.minAge !== null || category.maxAge !== null) && (
        <Notice>
          Elegibilidad de {category.name}: entre {category.minAge ?? '—'} y {category.maxAge ?? '—'} años. El Team Service la valida automáticamente
          consultando al League Service.
        </Notice>
      )}
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <SectionTitle title={`Equipos (${teams?.length ?? 0})`} />
          <Card className="divide-y divide-line overflow-hidden">
            {(teams ?? []).map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelected(team.id)}
                className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface', selected === team.id && 'bg-surface')}
              >
                <TeamBadge name={team.name} color={team.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{team.name}</span>
                  <span className="text-xs text-muted">{team._count?.players ?? 0} jugadores</span>
                </span>
              </button>
            ))}
            {teams?.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">Sin equipos todavía</p>}
          </Card>
          <form onSubmit={create} className="space-y-3">
            <Field label="Nuevo equipo">
              <Input required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre del equipo" />
            </Field>
            <Input value={form.coachName} onChange={(e) => setForm((f) => ({ ...f, coachName: e.target.value }))} placeholder="Entrenador (opcional)" />
            <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="Correo de contacto (opcional)" />
            <Select value={form.homeVenueId} onChange={(e) => setForm((f) => ({ ...f, homeVenueId: e.target.value }))}>
              <option value="">Sin cancha propia</option>
              {league.venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  Cancha propia: {venue.name}
                </option>
              ))}
            </Select>
            <Button type="submit" loading={busy} className="w-full">
              Inscribir equipo
            </Button>
          </form>
        </div>
        <div>
          {selectedTeam ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TeamBadge name={selectedTeam.name} color={selectedTeam.color} />
                  <div>
                    <p className="font-semibold">{selectedTeam.name}</p>
                    <p className="text-xs text-muted">
                      {[selectedTeam.coachName && `DT ${selectedTeam.coachName}`, selectedTeam.contactEmail].filter(Boolean).join(' · ') || 'Plantilla'}
                    </p>
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => removeTeam(selectedTeam)}>
                  Eliminar equipo
                </Button>
              </div>
              <Roster team={selectedTeam} onChanged={() => void reload()} />
            </div>
          ) : (
            <EmptyState title="Selecciona un equipo" description="Verás su plantilla, la elegibilidad de cada jugador y podrás inscribir más." />
          )}
        </div>
      </div>
    </div>
  );
}
