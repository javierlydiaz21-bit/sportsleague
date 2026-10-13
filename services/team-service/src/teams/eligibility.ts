export type EligibilityResult = {
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING';
  note: string;
};

export interface AgeRange {
  minAge: number | null;
  maxAge: number | null;
}

/** Edad cumplida en una fecha de referencia (cálculo en UTC para evitar desfases de zona horaria). */
export function ageOn(birthDate: Date, reference: Date): number {
  let age = reference.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

/**
 * Verificación automática de elegibilidad al momento del fichaje: la edad del
 * jugador debe estar dentro del rango de la categoría (definido en el League Service).
 */
export function evaluateEligibility(birthDate: Date, range: AgeRange | undefined, reference = new Date()): EligibilityResult {
  if (!range) {
    return {
      status: 'PENDING',
      note: 'Validación pendiente: no se pudo consultar el rango de edad de la categoría. Revalida más tarde.',
    };
  }
  const age = ageOn(birthDate, reference);
  if (age < 3 || age > 100) return { status: 'INELIGIBLE', note: 'La fecha de nacimiento no es válida' };
  if (range.minAge !== null && age < range.minAge) {
    return { status: 'INELIGIBLE', note: `Tiene ${age} años; la categoría exige mínimo ${range.minAge}` };
  }
  if (range.maxAge !== null && age > range.maxAge) {
    return { status: 'INELIGIBLE', note: `Tiene ${age} años; la categoría permite máximo ${range.maxAge}` };
  }
  return { status: 'ELIGIBLE', note: `Edad ${age}: dentro del rango de la categoría` };
}

const PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#059669'];

/** Color estable para el escudo minimalista del equipo. */
export function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
