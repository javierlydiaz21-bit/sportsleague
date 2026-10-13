import { dayNumber, roundRobin, scheduleRounds, SchedulingError, venueSlots, weekdayOf, type VenueAvailability } from './scheduler';

const teams = (n: number) => Array.from({ length: n }, (_, i) => `T${i + 1}`);

describe('roundRobin', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10])('con %i equipos todos se enfrentan exactamente una vez', (n) => {
    const rounds = roundRobin(teams(n));
    expect(rounds).toHaveLength(n % 2 === 0 ? n - 1 : n);
    const pairs = new Set<string>();
    for (const round of rounds) {
      const playing = round.flatMap((p) => [p.home, p.away]);
      expect(new Set(playing).size).toBe(playing.length); // nadie juega dos veces en la misma jornada
      for (const p of round) pairs.add([p.home, p.away].sort().join('-'));
    }
    expect(pairs.size).toBe((n * (n - 1)) / 2);
  });

  it.each([4, 5, 6, 8, 10])('equilibra la localía con %i equipos', (n) => {
    const home = new Map<string, number>();
    const away = new Map<string, number>();
    for (const round of roundRobin(teams(n))) {
      for (const p of round) {
        home.set(p.home, (home.get(p.home) ?? 0) + 1);
        away.set(p.away, (away.get(p.away) ?? 0) + 1);
      }
    }
    for (const team of teams(n)) {
      expect(Math.abs((home.get(team) ?? 0) - (away.get(team) ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  it('en ida y vuelta cada cruce se juega una vez en cada cancha', () => {
    const rounds = roundRobin(teams(4), true);
    expect(rounds).toHaveLength(6);
    const directed = new Set(rounds.flat().map((p) => `${p.home}>${p.away}`));
    expect(directed.size).toBe(12);
  });
});

describe('scheduleRounds', () => {
  const weekend = [6, 0];
  const venues: VenueAvailability[] = [
    { id: 'V1', name: 'Estadio', zone: 'Centro', availableDays: [6, 0], openTime: '08:00', closeTime: '18:00' },
    { id: 'V2', name: 'La Ribera', zone: 'Norte', availableDays: [6], openTime: '08:00', closeTime: '12:00' },
  ];

  it('genera franjas según el horario de la cancha', () => {
    expect(venueSlots({ openTime: '08:00', closeTime: '18:00' }, 120)).toEqual(['08:00', '10:00', '12:00', '14:00', '16:00']);
    expect(venueSlots({ openTime: '08:00', closeTime: '09:00' }, 120)).toEqual([]);
  });

  it('respeta días de juego, descanso mínimo y no repite cancha/hora', () => {
    const rounds = roundRobin(teams(6), true);
    const result = scheduleRounds(rounds, venues, { startDate: '2026-09-05', matchDays: weekend, slotMinutes: 120, minRestDays: 3 });
    expect(result).toHaveLength(30);

    const slots = new Set<string>();
    const lastByTeam = new Map<string, number>();
    for (const match of [...result].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))) {
      const day = dayNumber(match.date);
      expect(weekend).toContain(weekdayOf(day));
      const key = `${match.venueId}|${match.date}|${match.time}`;
      expect(slots.has(key)).toBe(false);
      slots.add(key);
      for (const team of [match.homeTeamId, match.awayTeamId]) {
        const last = lastByTeam.get(team);
        if (last !== undefined) expect(day - last).toBeGreaterThanOrEqual(3);
        lastByTeam.set(team, day);
      }
      const venue = venues.find((v) => v.id === match.venueId)!;
      expect(venue.availableDays).toContain(weekdayOf(day));
    }
  });

  it('las jornadas avanzan en orden', () => {
    const result = scheduleRounds(roundRobin(teams(4)), venues, { startDate: '2026-09-05', matchDays: weekend, slotMinutes: 120, minRestDays: 2 });
    for (let i = 1; i < result.length; i += 1) {
      if (result[i].round > result[i - 1].round) expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it('prefiere la cancha propia del equipo local', () => {
    const result = scheduleRounds([[{ home: 'T1', away: 'T2' }]], venues, {
      startDate: '2026-09-05',
      matchDays: weekend,
      slotMinutes: 120,
      minRestDays: 3,
      homeVenues: { T1: 'V2' },
    });
    expect(result[0].venueId).toBe('V2');
  });

  it('informa cuando no hay capacidad suficiente', () => {
    const tiny: VenueAvailability[] = [{ id: 'V', name: 'Mini', zone: 'Sur', availableDays: [6], openTime: '08:00', closeTime: '10:00' }];
    expect(() =>
      scheduleRounds(roundRobin(teams(8)), tiny, { startDate: '2026-09-05', matchDays: [6], slotMinutes: 120, minRestDays: 3, roundSpreadDays: 0 }),
    ).toThrow(SchedulingError);
    expect(() => scheduleRounds(roundRobin(teams(4)), [], { startDate: '2026-09-05', matchDays: [6], slotMinutes: 120, minRestDays: 3 })).toThrow(
      SchedulingError,
    );
  });
});
