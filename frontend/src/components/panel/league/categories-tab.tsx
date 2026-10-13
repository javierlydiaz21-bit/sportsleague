'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { TIEBREAKER_LABEL, errorMessage } from '@/lib/format';
import type { Category, Rules, Sport } from '@/lib/types';
import { Modal, useToast } from '../../overlay';
import { Badge, Button, Card, EmptyState, Field, Input, SectionTitle, cn } from '../../ui';
import type { LeagueTabProps } from '../league-manager';

const DEFAULT_RULES: Record<Sport, Rules> = {
  FOOTBALL: { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakerCriteria: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'] },
  BASKETBALL: { pointsWin: 2, pointsDraw: 0, pointsLoss: 1, tiebreakerCriteria: ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE', 'GOALS_FOR'] },
  VOLLEYBALL: { pointsWin: 3, pointsDraw: 0, pointsLoss: 0, tiebreakerCriteria: ['WINS', 'GOAL_DIFFERENCE', 'GOALS_FOR'] },
};

/** Editor del reglamento: puntos y criterios de desempate en orden de prioridad. */
function RulesEditor({ value, onChange }: { value: Rules; onChange: (rules: Rules) => void }) {
  const toggle = (criterion: string) => {
    const has = value.tiebreakerCriteria.includes(criterion);
    onChange({
      ...value,
      tiebreakerCriteria: has ? value.tiebreakerCriteria.filter((c) => c !== criterion) : [...value.tiebreakerCriteria, criterion],
    });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(['pointsWin', 'pointsDraw', 'pointsLoss'] as const).map((key) => (
          <Field key={key} label={key === 'pointsWin' ? 'Victoria' : key === 'pointsDraw' ? 'Empate' : 'Derrota'}>
            <Input type="number" min={0} max={10} required value={value[key]} onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })} />
          </Field>
        ))}
      </div>
      <div>
        <p className="mb-2 text-[13px] font-medium">Criterios de desempate (en orden)</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(TIEBREAKER_LABEL).map(([key, label]) => {
            const index = value.tiebreakerCriteria.indexOf(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition',
                  index >= 0 ? 'border-fg bg-fg text-bg' : 'border-line-strong text-muted hover:text-fg',
                )}
              >
                {index >= 0 && <span className="tabular text-[11px] opacity-70">{index + 1}</span>}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CategoriesTab({ league, reload }: LeagueTabProps) {
  const { api } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', minAge: '', maxAge: '' });
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES[league.sport]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editRules, setEditRules] = useState<Rules>(DEFAULT_RULES[league.sport]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/leagues/${league.id}/categories`, {
        name: form.name,
        ...(form.minAge ? { minAge: Number(form.minAge) } : {}),
        ...(form.maxAge ? { maxAge: Number(form.maxAge) } : {}),
        rules,
      });
      await reload();
      setForm({ name: '', minAge: '', maxAge: '' });
      toast.success('Categoría creada');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveRules = async () => {
    if (!editing) return;
    try {
      const { pointsWin, pointsDraw, pointsLoss, tiebreakerCriteria } = editRules;
      await api.put(`/categories/${editing.id}/rules`, { pointsWin, pointsDraw, pointsLoss, tiebreakerCriteria });
      await reload();
      setEditing(null);
      toast.success('Reglamento actualizado: la tabla se recalcula automáticamente');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div>
        <SectionTitle title="Categorías" description="Cada categoría tiene su rango de edad (elegibilidad) y su propio reglamento." />
        {league.categories.length === 0 ? (
          <EmptyState title="Aún no hay categorías" description="Por ejemplo: Libre, Sub-17, Femenino." />
        ) : (
          <div className="space-y-3">
            {league.categories.map((category) => (
              <Card key={category.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{category.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {category.minAge !== null || category.maxAge !== null
                      ? `Edad ${category.minAge ?? 'sin mínimo'} – ${category.maxAge ?? 'sin máximo'}`
                      : 'Sin límite de edad'}
                  </p>
                  {category.rules && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge>
                        {category.rules.pointsWin}/{category.rules.pointsDraw}/{category.rules.pointsLoss} pts
                      </Badge>
                      {category.rules.tiebreakerCriteria.map((c, i) => (
                        <Badge key={c}>
                          {i + 1}. {TIEBREAKER_LABEL[c] ?? c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(category);
                    setEditRules(category.rules ?? DEFAULT_RULES[league.sport]);
                  }}
                >
                  Editar reglamento
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <SectionTitle title="Nueva categoría" />
        <Field label="Nombre">
          <Input required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Libre" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Edad mínima">
            <Input type="number" min={0} max={99} value={form.minAge} onChange={(e) => setForm((f) => ({ ...f, minAge: e.target.value }))} />
          </Field>
          <Field label="Edad máxima">
            <Input type="number" min={0} max={99} value={form.maxAge} onChange={(e) => setForm((f) => ({ ...f, maxAge: e.target.value }))} />
          </Field>
        </div>
        <RulesEditor value={rules} onChange={setRules} />
        <Button type="submit" loading={busy}>
          Crear categoría
        </Button>
      </form>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Reglamento · ${editing?.name ?? ''}`}
        description="Al guardar, el Statistics Service recalcula la tabla de posiciones de forma idempotente."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={saveRules}>Guardar</Button>
          </>
        }
      >
        <RulesEditor value={editRules} onChange={setEditRules} />
      </Modal>
    </div>
  );
}
