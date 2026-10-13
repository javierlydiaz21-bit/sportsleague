import { ageOn, colorFor, evaluateEligibility } from './eligibility';

const d = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('elegibilidad de jugadores', () => {
  it('calcula la edad cumplida considerando el día del cumpleaños', () => {
    expect(ageOn(d('2008-10-11'), d('2026-10-11'))).toBe(18);
    expect(ageOn(d('2008-10-12'), d('2026-10-11'))).toBe(17);
  });

  it('marca como elegible a quien está dentro del rango', () => {
    expect(evaluateEligibility(d('2009-05-01'), { minAge: 15, maxAge: 17 }, d('2026-10-11')).status).toBe('ELIGIBLE');
  });

  it('marca como no elegible a quien está fuera del rango con un motivo claro', () => {
    const result = evaluateEligibility(d('2000-01-01'), { minAge: 15, maxAge: 17 }, d('2026-10-11'));
    expect(result.status).toBe('INELIGIBLE');
    expect(result.note).toContain('máximo 17');
  });

  it('deja la validación pendiente si no se conoce el rango (League Service caído)', () => {
    expect(evaluateEligibility(d('2000-01-01'), undefined).status).toBe('PENDING');
  });

  it('acepta categorías sin límite de edad', () => {
    expect(evaluateEligibility(d('1970-01-01'), { minAge: null, maxAge: null }, d('2026-10-11')).status).toBe('ELIGIBLE');
  });

  it('asigna colores estables a los equipos', () => {
    expect(colorFor('Tigres')).toBe(colorFor('Tigres'));
    expect(colorFor('Tigres')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
