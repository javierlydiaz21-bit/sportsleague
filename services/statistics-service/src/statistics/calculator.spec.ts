import { computeDiscipline, computeStandings, computeTopScorers, DEFAULT_RULES, type ResultInput } from './calculator';

let day = 0;
function result(home: string, away: string, homeScore: number, awayScore: number, events: ResultInput['events'] = []): ResultInput {
  day += 1;
  return { matchId: `${home}-${away}-${day}`, homeTeamId: home, awayTeamId: away, homeScore, awayScore, completedAt: new Date(2026, 8, day), events };
}

describe('tabla de posiciones', () => {
  it('suma puntos según el reglamento e incluye equipos sin partidos', () => {
    const table = computeStandings(['A', 'B', 'C'], [result('A', 'B', 2, 0), result('B', 'A', 1, 1)], DEFAULT_RULES);
    expect(table.map((r) => [r.teamId, r.points, r.played])).toEqual([
      ['A', 4, 2],
      ['B', 1, 2],
      ['C', 0, 0],
    ]);
    expect(table[0]).toMatchObject({ wins: 1, draws: 1, goalsFor: 3, goalsAgainst: 1, goalDifference: 2, form: ['E', 'G'] });
  });

  it('desempata por diferencia de gol y luego por goles a favor', () => {
    const table = computeStandings(['A', 'B', 'C', 'D'], [result('A', 'C', 3, 1), result('B', 'D', 4, 2)], DEFAULT_RULES);
    // A y B: 3 puntos y +2; B anotó más. C y D: 0 puntos y -2; D anotó más.
    expect(table.map((r) => r.teamId)).toEqual(['B', 'A', 'D', 'C']);
  });

  it('aplica el enfrentamiento directo cuando el reglamento lo prioriza', () => {
    const results = [
      result('A', 'B', 1, 0),
      result('A', 'C', 0, 0),
      result('D', 'A', 1, 0),
      result('B', 'C', 5, 0),
      result('B', 'D', 0, 0),
      result('C', 'D', 0, 0),
    ];
    // A y B empatan a 4 puntos: A ganó el directo, pero B tiene mejor diferencia de gol.
    const h2hFirst = { ...DEFAULT_RULES, tiebreakerCriteria: ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE'] };
    expect(computeStandings(['A', 'B', 'C', 'D'], results, h2hFirst).map((r) => r.teamId)).toEqual(['D', 'A', 'B', 'C']);
    expect(computeStandings(['A', 'B', 'C', 'D'], results, DEFAULT_RULES).map((r) => r.teamId)).toEqual(['D', 'B', 'A', 'C']);
  });

  it('resuelve un triple empate circular con el siguiente criterio', () => {
    const rules = { ...DEFAULT_RULES, tiebreakerCriteria: ['HEAD_TO_HEAD', 'GOAL_DIFFERENCE'] };
    const table = computeStandings(['A', 'B', 'C'], [result('A', 'B', 1, 0), result('B', 'C', 5, 0), result('C', 'A', 1, 0)], rules);
    expect(table.map((r) => r.teamId)).toEqual(['B', 'A', 'C']);
  });

  it('usa los puntos personalizados (p. ej. básquet: 2 por victoria, 1 por derrota)', () => {
    const table = computeStandings(['A', 'B'], [result('A', 'B', 80, 75)], { pointsWin: 2, pointsDraw: 0, pointsLoss: 1, tiebreakerCriteria: [] });
    expect(table.map((r) => r.points)).toEqual([2, 1]);
  });

  it('es idempotente: el mismo conjunto de actas produce la misma tabla', () => {
    const results = [result('A', 'B', 2, 1), result('B', 'C', 0, 0)];
    expect(computeStandings(['A', 'B', 'C'], results, DEFAULT_RULES)).toEqual(computeStandings(['A', 'B', 'C'], results, DEFAULT_RULES));
  });
});

describe('goleadores y disciplina', () => {
  const results = [
    result('A', 'B', 3, 1, [
      { type: 'GOAL', teamId: 'A', playerId: 'p1', value: 1 },
      { type: 'GOAL', teamId: 'A', playerId: 'p1', value: 1 },
      { type: 'GOAL', teamId: 'A', playerId: 'p2', value: 1 },
      { type: 'GOAL', teamId: 'B', playerId: 'p9', value: 1 },
      { type: 'YELLOW_CARD', teamId: 'B', playerId: 'p9', value: 1 },
      { type: 'RED_CARD', teamId: 'A', playerId: 'p2', value: 1 },
    ]),
  ];

  it('ordena el ranking de goleadores', () => {
    expect(computeTopScorers(results)[0]).toEqual({ playerId: 'p1', teamId: 'A', goals: 2 });
  });

  it('acumula tarjetas por jugador', () => {
    expect(computeDiscipline(results)).toEqual([
      { playerId: 'p2', teamId: 'A', yellowCards: 0, redCards: 1 },
      { playerId: 'p9', teamId: 'B', yellowCards: 1, redCards: 0 },
    ]);
  });
});
