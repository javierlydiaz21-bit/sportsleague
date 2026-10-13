'use client';

import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LEAGUE_STATUS_LABEL, SPORT_LABEL, errorMessage, formatDate } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { League, LeagueStatus } from '@/lib/types';
import { Modal, useToast } from '../overlay';
import { STATUS_TONE } from '../panel/panel-home';
import { Badge, Button, Card, EmptyState, Field, Pills, SectionTitle, Table, Td, Textarea, Th } from '../ui';

type Decision = { league: League; status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' } | null;

const FILTERS: { value: LeagueStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'SUSPENDED', label: 'Suspendidas' },
];

const ACTION_LABEL = { APPROVED: 'Aprobar', REJECTED: 'Rechazar', SUSPENDED: 'Suspender' } as const;

export function LeaguesReview() {
  const { api } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<LeagueStatus | 'ALL'>('ALL');
  const pending = useAsync(() => api.get<League[]>('/leagues?status=PENDING&limit=100'), [api]);
  const all = useAsync(() => api.get<League[]>(`/leagues?limit=100${filter === 'ALL' ? '' : `&status=${filter}`}`), [api, filter]);
  const [decision, setDecision] = useState<Decision>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      await api.patch(`/leagues/${decision.league.id}/review`, { status: decision.status, ...(note ? { note } : {}) });
      toast.success(`Liga ${LEAGUE_STATUS_LABEL[decision.status].toLowerCase()}. Se notificó al organizador.`);
      setDecision(null);
      setNote('');
      await Promise.all([pending.reload(), all.reload()]);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle title="Pendientes de autorización" description="Al aprobarla, la liga se vuelve pública y el organizador puede generar el calendario." />
        {pending.data && pending.data.length === 0 ? (
          <EmptyState title="No hay ligas pendientes" description="Todo está al día." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(pending.data ?? []).map((league) => (
              <Card key={league.id} className="flex flex-col justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="amber">Pendiente</Badge>
                    <span className="text-xs text-muted">{formatDate(league.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 font-semibold tracking-tight">{league.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {SPORT_LABEL[league.sport]}
                    {league.city ? ` · ${league.city}` : ''} · por {league.ownerName ?? 'organizador'}
                  </p>
                  {league.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{league.description}</p>}
                  {league._count && (
                    <p className="mt-2 text-xs text-subtle">
                      {league._count.seasons} temporada(s) · {league._count.categories} categoría(s) · {league._count.venues} cancha(s) configuradas
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setDecision({ league, status: 'APPROVED' })}>
                    <Check className="h-4 w-4" /> Aprobar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDecision({ league, status: 'REJECTED' })}>
                    <X className="h-4 w-4" /> Rechazar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Todas las ligas" />
        <div className="mb-4">
          <Pills options={FILTERS} value={filter} onChange={setFilter} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Liga</Th>
              <Th>Organizador</Th>
              <Th>Estado</Th>
              <Th>Revisión</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {(all.data ?? []).map((league) => (
              <tr key={league.id}>
                <Td>
                  <Link href={`/ligas/${league.id}`} className="font-medium hover:underline">
                    {league.name}
                  </Link>
                  <p className="text-xs text-muted">{SPORT_LABEL[league.sport]}</p>
                </Td>
                <Td className="text-muted">{league.ownerName ?? '—'}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[league.status]}>{LEAGUE_STATUS_LABEL[league.status]}</Badge>
                </Td>
                <Td className="max-w-56 truncate text-xs text-muted">{league.reviewNote ?? (league.reviewedAt ? formatDate(league.reviewedAt) : '—')}</Td>
                <Td className="text-right">
                  {league.status === 'APPROVED' && (
                    <Button size="sm" variant="ghost" onClick={() => setDecision({ league, status: 'SUSPENDED' })}>
                      Suspender
                    </Button>
                  )}
                  {(league.status === 'SUSPENDED' || league.status === 'REJECTED') && (
                    <Button size="sm" variant="ghost" onClick={() => setDecision({ league, status: 'APPROVED' })}>
                      Aprobar
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
            {all.data?.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-muted">
                  No hay ligas con este estado
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </section>

      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision ? `${ACTION_LABEL[decision.status]} "${decision.league.name}"` : ''}
        description="El organizador recibirá una notificación con tu decisión."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>
              Cancelar
            </Button>
            <Button variant={decision?.status === 'APPROVED' ? 'primary' : 'danger'} onClick={decide} loading={busy}>
              {decision ? ACTION_LABEL[decision.status] : ''}
            </Button>
          </>
        }
      >
        <Field label="Nota para el organizador" hint={decision?.status === 'APPROVED' ? 'Opcional.' : 'Explica el motivo.'}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
      </Modal>
    </div>
  );
}
