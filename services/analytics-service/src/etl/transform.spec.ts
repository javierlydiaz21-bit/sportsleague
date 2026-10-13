import { buildAttendance, buildLeagueKpis, buildSuspended, buildTrends, type FixtureRow, type ResultRow } from './transform';

const match = (id: string, status: string, overrides: Partial<FixtureRow> = {}): FixtureRow => ({
  id,
  league_id: 'L1',
  season_id: 'S1',
  category_id: 'C1',
  owner_id: 'O1',
  status,
  scheduled_at: new Date('2026-09-05T15:00:00Z'),
  suspension_reason: null,
  home_team_id: 'A',
  away_team_id: 'B',
  ...overrides,
});

describe('ETL de analítica', () => {
  const matches = [match('M1', 'FINISHED'), match('M2', 'FINISHED'), match('M3', 'SUSPENDED', { suspension_reason: 'Lluvia' }), match('M4', 'SCHEDULED')];
  const live = [
    { match_id: 'M1', status: 'FINISHED', attendance: 200, peak_viewers: 35 },
    { match_id: 'M2', status: 'FINISHED', attendance: null, peak_viewers: 80 },
  ];
  const events = [
    { match_id: 'M1', type: 'GOAL', value: 1 },
    { match_id: 'M1', type: 'GOAL', value: 1 },
    { match_id: 'M2', type: 'GOAL', value: 1 },
    { match_id: 'M2', type: 'YELLOW_CARD', value: 1 },
  ];

  it('estima la asistencia con el acta o, si no se reportó, con el pico de espectadores en línea', () => {
    const rows = buildAttendance(matches, live);
    expect(rows.map((r) => [r.matchId, r.estimatedAttendance, r.source])).toEqual([
      ['M1', 200, 'REPORTED'],
      ['M2', 80, 'ONLINE_PEAK'],
    ]);
  });

  it('lista los partidos suspendidos con su motivo', () => {
    expect(buildSuspended(matches)).toEqual([expect.objectContaining({ matchId: 'M3', reason: 'Lluvia' })]);
  });

  it('calcula los KPIs de la liga', () => {
    expect(buildLeagueKpis(matches, live, events)[0]).toMatchObject({
      totalMatches: 4,
      finished: 2,
      suspended: 1,
      scheduled: 1,
      totalGoals: 3,
      totalCards: 1,
      avgGoalsPerMatch: 1.5,
      avgAttendance: 140,
    });
  });

  it('acumula la tendencia de rendimiento partido a partido', () => {
    const results: ResultRow[] = [
      { match_id: 'M1', league_id: 'L1', season_id: 'S1', category_id: 'C1', home_team_id: 'A', away_team_id: 'B', home_score: 2, away_score: 0, completed_at: new Date('2026-09-05') },
      { match_id: 'M2', league_id: 'L1', season_id: 'S1', category_id: 'C1', home_team_id: 'B', away_team_id: 'A', home_score: 1, away_score: 1, completed_at: new Date('2026-09-12') },
    ];
    const trendA = buildTrends(results).filter((r) => r.teamId === 'A');
    expect(trendA.map((r) => [r.matchIndex, r.result, r.pointsCumulative, r.goalDifferenceCumulative])).toEqual([
      [1, 'G', 3, 2],
      [2, 'E', 4, 2],
    ]);
  });
});
