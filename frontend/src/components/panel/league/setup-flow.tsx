'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import type { LeagueDetail } from '@/lib/types';
import { Button, Notice } from '../../ui';

/* ------------------------------------------------------------------ */
/* Pasos para poner en marcha la liga                                  */
/* ------------------------------------------------------------------ */

export type StepKey = 'resumen' | 'temporadas' | 'categorias' | 'canchas' | 'equipos' | 'arbitros' | 'calendario';

/** Orden del flujo (Estadísticas y Analítica quedan fuera: son pestañas normales). */
export const SETUP_STEPS: { key: StepKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'temporadas', label: 'Temporadas' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'canchas', label: 'Canchas' },
  { key: 'equipos', label: 'Equipos' },
  { key: 'arbitros', label: 'Árbitros' },
  { key: 'calendario', label: 'Calendario' },
];

/** Mínimo de equipos para generar el calendario (lo exige el Fixture Service). */
export const MIN_TEAMS = 2;

/** Conteos que no vienen en la liga (los mismos que muestra la lista de pasos en Resumen). */
export interface SetupProgress {
  teams: number;
  referees: number;
  published: boolean;
}

export interface StepState {
  key: StepKey;
  label: string;
  done: boolean;
  /** Qué falta para completar el paso (se muestra bajo «Siguiente»). */
  requirement: string;
}

export function computeSteps(league: LeagueDetail, progress?: SetupProgress): StepState[] {
  const checking = progress === undefined;
  const status: Record<StepKey, { done: boolean; requirement: string }> = {
    resumen: { done: league.name.trim().length >= 3, requirement: 'Guarda el nombre de la liga para continuar.' },
    temporadas: { done: league.seasons.length > 0, requirement: 'Agrega al menos una temporada para continuar.' },
    categorias: {
      done: league.categories.some((c) => c.rules),
      requirement: 'Agrega al menos una categoría con su reglamento para continuar.',
    },
    canchas: {
      done: league.venues.some((v) => v.availableDays.length > 0),
      requirement: 'Registra al menos una cancha con días de disponibilidad para continuar.',
    },
    equipos: {
      done: (progress?.teams ?? 0) >= MIN_TEAMS,
      requirement: checking ? 'Comprobando los equipos inscritos…' : `Inscribe al menos ${MIN_TEAMS} equipos para continuar (es el mínimo para generar el calendario).`,
    },
    arbitros: {
      done: (progress?.referees ?? 0) > 0,
      requirement: checking ? 'Comprobando los árbitros registrados…' : 'Registra al menos un árbitro para continuar.',
    },
    calendario: { done: !!progress?.published, requirement: 'Publica el calendario para terminar.' },
  };
  return SETUP_STEPS.map((step) => ({ ...step, ...status[step.key] }));
}

/* ------------------------------------------------------------------ */
/* Contexto del flujo (lo provee LeagueManager)                        */
/* ------------------------------------------------------------------ */

export interface SetupContextValue {
  league: LeagueDetail;
  steps: StepState[];
  progress?: SetupProgress;
  refreshProgress: () => Promise<void>;
  /** Cambia de sección como el flujo: nueva entrada en el historial y vuelta al inicio de la página. */
  goToStep: (key: StepKey) => void;
  /** true si se puede salir de la sección (no hay cambios sin guardar o el usuario acepta perderlos). */
  confirmLeave: () => boolean;
  reportUnsaved: (id: string, dirty: boolean) => void;
}

export const SetupContext = createContext<SetupContextValue | null>(null);

export function useSetup(): SetupContextValue {
  const value = useContext(SetupContext);
  if (!value) throw new Error('useSetup debe usarse dentro de LeagueManager');
  return value;
}

/**
 * Registra si un formulario de la sección tiene cambios sin guardar (compara su estado con el del
 * último guardado). Devuelve `markSaved`, que la sección llama tras guardar con éxito.
 */
export function useUnsavedChanges(value: unknown): () => void {
  const { reportUnsaved } = useSetup();
  const id = useId();
  const current = JSON.stringify(value);
  const [baseline, setBaseline] = useState(current);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    if (savedAt) setBaseline(current);
    // Solo al marcar como guardado: el estado de ese render es el nuevo punto de partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAt]);

  const dirty = current !== baseline;
  useEffect(() => reportUnsaved(id, dirty), [reportUnsaved, id, dirty]);
  useEffect(() => () => reportUnsaved(id, false), [reportUnsaved, id]);

  return useCallback(() => setSavedAt((n) => n + 1), []);
}

/* ------------------------------------------------------------------ */
/* Navegación entre pasos                                              */
/* ------------------------------------------------------------------ */

export interface StepPrimaryAction {
  label: string;
  onClick: () => void | Promise<void>;
  loading?: boolean;
}

/**
 * Botones «Anterior» / «Siguiente» al final de cada sección del flujo. En el último paso
 * (Calendario) muestra el aviso de aprobación, los pasos que faltan o la acción `finalAction`.
 */
export function StepNavigation({
  step,
  onBeforeNext,
  finalAction,
  finalDone,
}: {
  step: StepKey;
  /** Se ejecuta antes de avanzar (p. ej. guardar); si devuelve false no se avanza. */
  onBeforeNext?: () => Promise<boolean>;
  /** Último paso: acción principal (p. ej. «Generar y publicar calendario»). */
  finalAction?: StepPrimaryAction;
  /** Último paso: mensaje cuando ya está completo (en lugar de la acción). */
  finalDone?: ReactNode;
}) {
  const { league, steps, goToStep, confirmLeave } = useSetup();
  const [busy, setBusy] = useState(false);
  const requirementId = useId();
  const index = steps.findIndex((s) => s.key === step);
  const current = steps[index];
  const previous = steps[index - 1];
  const next = steps[index + 1];

  const goNext = async () => {
    if (!next || !current.done) return;
    if (onBeforeNext) {
      setBusy(true);
      try {
        if (!(await onBeforeNext())) return;
      } finally {
        setBusy(false);
      }
    } else if (!confirmLeave()) {
      return;
    }
    goToStep(next.key);
  };

  const goPrevious = () => {
    if (previous && confirmLeave()) goToStep(previous.key);
  };

  return (
    <nav aria-label="Pasos para poner en marcha la liga" className="mt-10 border-t border-line pt-5">
      <p className="mb-3 text-xs text-subtle">
        Paso {index + 1} de {steps.length}
      </p>

      {next ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {previous && (
              <Button type="button" variant="secondary" onClick={goPrevious}>
                <ArrowLeft className="h-4 w-4" /> Anterior: {previous.label}
              </Button>
            )}
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <Button
              type="button"
              onClick={() => void goNext()}
              loading={busy}
              disabled={!current.done}
              aria-describedby={current.done ? undefined : requirementId}
            >
              Siguiente: {next.label} <ArrowRight className="h-4 w-4" />
            </Button>
            {!current.done && (
              <p id={requirementId} className="text-right text-xs text-warn">
                {current.requirement}
              </p>
            )}
          </div>
        </div>
      ) : (
        <FinalStep league={league} steps={steps} previous={previous} goPrevious={goPrevious} goToStep={goToStep} finalAction={finalAction} finalDone={finalDone} />
      )}
    </nav>
  );
}

function FinalStep({
  league,
  steps,
  previous,
  goPrevious,
  goToStep,
  finalAction,
  finalDone,
}: {
  league: LeagueDetail;
  steps: StepState[];
  previous?: StepState;
  goPrevious: () => void;
  goToStep: (key: StepKey) => void;
  finalAction?: StepPrimaryAction;
  finalDone?: ReactNode;
}) {
  // Pasos 2 a 6 (Resumen y el propio Calendario no cuentan como requisito previo).
  const missing = steps.slice(1, -1).filter((s) => !s.done);
  const published = steps[steps.length - 1].done;

  let content: ReactNode;
  if (missing.length > 0) {
    content = (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Para generar el calendario falta completar:</p>
        <ul className="space-y-1">
          {missing.map((s) => (
            <li key={s.key}>
              <Link
                href={`/panel/ligas/${league.id}?tab=${s.key}`}
                onClick={(event) => {
                  event.preventDefault();
                  goToStep(s.key);
                }}
                className="font-medium text-fg underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/20"
              >
                {s.label}
              </Link>
              <span className="text-muted"> · {s.requirement}</span>
            </li>
          ))}
        </ul>
        {league.status === 'PENDING' && <p className="text-muted">Además, un administrador debe aprobar la liga.</p>}
      </div>
    );
  } else if (league.status === 'PENDING') {
    content = (
      <Notice tone="amber" title="Todo listo">
        Podrás generar y publicar el calendario cuando un administrador apruebe la liga.
      </Notice>
    );
  } else if (league.status !== 'APPROVED') {
    content = (
      <Notice tone="red" title={league.status === 'REJECTED' ? 'Liga rechazada' : 'Liga suspendida'}>
        No se puede publicar el calendario mientras la liga no esté aprobada.
      </Notice>
    );
  } else if (finalAction && !published) {
    content = (
      <Button type="button" onClick={() => void finalAction.onClick()} loading={finalAction.loading}>
        {finalAction.label}
      </Button>
    );
  } else {
    content = finalDone;
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {previous && (
          <Button type="button" variant="secondary" onClick={goPrevious}>
            <ArrowLeft className="h-4 w-4" /> Anterior: {previous.label}
          </Button>
        )}
      </div>
      <div className="ml-auto flex max-w-xl flex-col items-end gap-2">{content}</div>
    </div>
  );
}

/** Check pequeño para marcar un paso completo (pestañas y lista de Resumen). */
export function StepCheck({ className = '' }: { className?: string }) {
  return <Check aria-hidden className={`h-3.5 w-3.5 text-brand ${className}`} strokeWidth={3} />;
}
