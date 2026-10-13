import { computeScore, normalizeValue } from './score';

describe('marcador en vivo', () => {
  it('suma los tantos de cada equipo e ignora tarjetas y sustituciones', () => {
    const score = computeScore(
      [
        { type: 'GOAL', teamId: 'H', value: 1 },
        { type: 'YELLOW_CARD', teamId: 'H', value: 1 },
        { type: 'GOAL', teamId: 'A', value: 1 },
        { type: 'GOAL', teamId: 'H', value: 1 },
        { type: 'SUBSTITUTION', teamId: 'A', value: 1 },
      ],
      'H',
      'A',
    );
    expect(score).toEqual({ home: 2, away: 1 });
  });

  it('admite canastas de 2 y 3 puntos (básquet)', () => {
    expect(computeScore([{ type: 'GOAL', teamId: 'H', value: 3 }, { type: 'GOAL', teamId: 'A', value: 2 }], 'H', 'A')).toEqual({
      home: 3,
      away: 2,
    });
  });

  it('normaliza el valor de los eventos', () => {
    expect(normalizeValue('GOAL', 3)).toBe(3);
    expect(normalizeValue('GOAL', 9)).toBe(3);
    expect(normalizeValue('YELLOW_CARD', 3)).toBe(1);
  });
});
