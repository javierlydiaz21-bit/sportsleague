import { canTransition, defaultRules, isValidTime, minutesOf, toDateOnly } from './rules';

describe('reglas de la liga', () => {
  it('define reglamentos por defecto coherentes con cada deporte', () => {
    expect(defaultRules('FOOTBALL')).toMatchObject({ pointsWin: 3, pointsDraw: 1, pointsLoss: 0 });
    expect(defaultRules('BASKETBALL')).toMatchObject({ pointsWin: 2, pointsLoss: 1 });
    expect(defaultRules('VOLLEYBALL').tiebreakerCriteria[0]).toBe('WINS');
  });

  it('solo permite las transiciones de revisión válidas', () => {
    expect(canTransition('PENDING', 'APPROVED')).toBe(true);
    expect(canTransition('PENDING', 'REJECTED')).toBe(true);
    expect(canTransition('PENDING', 'SUSPENDED')).toBe(false);
    expect(canTransition('APPROVED', 'SUSPENDED')).toBe(true);
    expect(canTransition('APPROVED', 'REJECTED')).toBe(false);
    expect(canTransition('SUSPENDED', 'APPROVED')).toBe(true);
  });

  it('valida horas y fechas', () => {
    expect(isValidTime('08:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(minutesOf('10:15')).toBe(615);
    expect(toDateOnly('2026-09-05').toISOString()).toBe('2026-09-05T00:00:00.000Z');
  });
});
