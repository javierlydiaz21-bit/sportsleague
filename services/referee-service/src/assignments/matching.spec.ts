import { localParts, parseOffset, rankCandidates, type MatchSlot, type RefereeCandidate } from './matching';

const options = { offsetMinutes: -300, matchMinutes: 120 };
const owner = 'owner-1';

function referee(id: string, overrides: Partial<RefereeCandidate> = {}): RefereeCandidate {
  return {
    id,
    name: id,
    ownerId: owner,
    leagueId: null,
    zone: 'Centro',
    categoriesCertified: [],
    active: true,
    availability: [{ dayOfWeek: 6, startTime: '07:00', endTime: '20:00' }],
    ...overrides,
  };
}

// Sábado 5 de septiembre de 2026, 10:00 en Colombia = 15:00 UTC.
const slot: MatchSlot = {
  matchId: 'M1',
  ownerId: owner,
  leagueId: 'L1',
  categoryId: 'C1',
  scheduledAt: new Date('2026-09-05T15:00:00.000Z'),
  venueZone: 'Norte',
};

describe('asignación de árbitros', () => {
  it('convierte la hora UTC a la hora local de la liga', () => {
    expect(parseOffset('-05:00')).toBe(-300);
    expect(localParts(slot.scheduledAt, -300)).toEqual({ day: 6, minutes: 600 });
  });

  it('prioriza la misma zona geográfica de la cancha', () => {
    const ranked = rankCandidates(slot, [referee('A'), referee('B', { zone: 'norte' })], [], options);
    expect(ranked.map((r) => r.id)).toEqual(['B', 'A']);
  });

  it('descarta árbitros sin disponibilidad, de otra liga, no certificados o inactivos', () => {
    const ranked = rankCandidates(
      slot,
      [
        referee('domingo', { availability: [{ dayOfWeek: 0, startTime: '07:00', endTime: '20:00' }] }),
        referee('tarde', { availability: [{ dayOfWeek: 6, startTime: '14:00', endTime: '20:00' }] }),
        referee('otra-liga', { leagueId: 'L2' }),
        referee('sin-cert', { categoriesCertified: ['C9'] }),
        referee('inactivo', { active: false }),
        referee('otro-dueño', { ownerId: 'owner-2' }),
        referee('ok', { categoriesCertified: ['C1'], leagueId: 'L1' }),
      ],
      [],
      options,
    );
    expect(ranked.map((r) => r.id)).toEqual(['ok']);
  });

  it('evita cruces de horario y reparte la carga', () => {
    const busy = [
      { refereeId: 'A', matchId: 'M0', scheduledAt: new Date('2026-09-05T16:00:00.000Z') },
      { refereeId: 'B', matchId: 'M7', scheduledAt: new Date('2026-09-12T15:00:00.000Z') },
    ];
    const ranked = rankCandidates(slot, [referee('A'), referee('B'), referee('C')], busy, options);
    expect(ranked.map((r) => r.id)).toEqual(['C', 'B']);
  });

  it('respeta las exclusiones (árbitro que rechazó el partido)', () => {
    const ranked = rankCandidates(slot, [referee('A'), referee('B')], [], { ...options, excludeRefereeIds: ['A'] });
    expect(ranked.map((r) => r.id)).toEqual(['B']);
  });
});
