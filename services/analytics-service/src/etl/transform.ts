/** Etapa "T" del ETL: transformaciones puras sobre los datos extraídos de las réplicas. */

export interface FixtureRow {
  id: string;
  league_id: string;
  season_id: string;
  category_id: string;
  owner_id: string;
  status: string;
  scheduled_at: Date;
  suspension_reason: string | null;
  home_team_id: string;
  away_team_id: string;
}

export interface LiveRow {
  match_id: string;
  status: string;
  attendance: number | null;
  peak_viewers: number;
}

export interface EventRow {
  match_id: string;
  type: string;
  value: number;
}

export interface ResultRow {
  match_id: string;
  league_id: string;
  season_id: string;
  category_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  completed_at: Date;
}

export function buildAttendance(matches: FixtureRow[], live: LiveRow[]) {
  const liveById = new Map(live.map((row) => [row.match_id, row]));
  return matches.flatMap((match) => {
    const state = liveById.get(match.id);
    if (!state || state.status !== 'FINISHED') return [];
    const reported = state.attendance !== null && state.attendance !== undefined;
    return [
      {
        matchId: match.id,
        leagueId: match.league_id,
        seasonId: match.season_id,
        categoryId: match.category_id,
        ownerId: match.owner_id,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        scheduledAt: new Date(match.scheduled_at),
        estimatedAttendance: reported ? Number(state.attendance) : Number(state.peak_viewers ?? 0),
        source: reported ? 'REPORTED' : 'ONLINE_PEAK',
      },
    ];
  });
}

export function buildSuspended(matches: FixtureRow[]) {
  return matches
    .filter((match) => match.status === 'SUSPENDED')
    .map((match) => ({
      matchId: match.id,
      leagueId: match.league_id,
      seasonId: match.season_id,
      categoryId: match.category_id,
      ownerId: match.owner_id,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      reason: match.suspension_reason,
      scheduledAt: new Date(match.scheduled_at),
    }));
}

/** Evolución del rendimiento: puntos (3/1/0) y diferencia de gol acumulados partido a partido. */
export function buildTrends(results: ResultRow[]) {
  const ordered = [...results].sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
  const progress = new Map<string, { index: number; points: number; gd: number }>();
  const rows: {
    teamId: string;
    seasonId: string;
    categoryId: string;
    leagueId: string;
    matchIndex: number;
    matchId: string;
    result: string;
    pointsCumulative: number;
    goalDifferenceCumulative: number;
    playedAt: Date;
  }[] = [];
  for (const r of ordered) {
    for (const [teamId, gf, ga] of [
      [r.home_team_id, r.home_score, r.away_score],
      [r.away_team_id, r.away_score, r.home_score],
    ] as const) {
      const key = `${teamId}:${r.season_id}`;
      const state = progress.get(key) ?? { index: 0, points: 0, gd: 0 };
      state.index += 1;
      state.points += gf > ga ? 3 : gf === ga ? 1 : 0;
      state.gd += gf - ga;
      progress.set(key, state);
      rows.push({
        teamId,
        seasonId: r.season_id,
        categoryId: r.category_id,
        leagueId: r.league_id,
        matchIndex: state.index,
        matchId: r.match_id,
        result: gf > ga ? 'G' : gf === ga ? 'E' : 'P',
        pointsCumulative: state.points,
        goalDifferenceCumulative: state.gd,
        playedAt: new Date(r.completed_at),
      });
    }
  }
  return rows;
}

export function buildLeagueKpis(matches: FixtureRow[], live: LiveRow[], events: EventRow[]) {
  const liveById = new Map(live.map((row) => [row.match_id, row]));
  const goalsByMatch = new Map<string, number>();
  const cardsByMatch = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'GOAL') goalsByMatch.set(event.match_id, (goalsByMatch.get(event.match_id) ?? 0) + Number(event.value ?? 1));
    if (event.type === 'YELLOW_CARD' || event.type === 'RED_CARD') {
      cardsByMatch.set(event.match_id, (cardsByMatch.get(event.match_id) ?? 0) + 1);
    }
  }

  const leagues = new Map<string, FixtureRow[]>();
  for (const match of matches) leagues.set(match.league_id, [...(leagues.get(match.league_id) ?? []), match]);

  return [...leagues.entries()].map(([leagueId, list]) => {
    const finished = list.filter((m) => m.status === 'FINISHED' || liveById.get(m.id)?.status === 'FINISHED');
    const totalGoals = finished.reduce((sum, m) => sum + (goalsByMatch.get(m.id) ?? 0), 0);
    const totalCards = list.reduce((sum, m) => sum + (cardsByMatch.get(m.id) ?? 0), 0);
    const attendances = finished
      .map((m) => liveById.get(m.id))
      .filter((state): state is LiveRow => !!state)
      .map((state) => (state.attendance ?? state.peak_viewers ?? 0) as number);
    const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
    return {
      leagueId,
      ownerId: list[0].owner_id,
      totalMatches: list.length,
      scheduled: list.filter((m) => m.status === 'SCHEDULED').length,
      live: list.filter((m) => m.status === 'LIVE').length,
      finished: finished.length,
      suspended: list.filter((m) => m.status === 'SUSPENDED').length,
      totalGoals,
      totalCards,
      avgGoalsPerMatch: finished.length ? Math.round((totalGoals / finished.length) * 100) / 100 : 0,
      avgAttendance: Math.round(avg(attendances) * 10) / 10,
    };
  });
}
