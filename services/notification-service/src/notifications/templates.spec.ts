import { finalResult, leagueReviewed, matchRescheduled, refereeAssigned, roundPublished } from './templates';

describe('plantillas de notificación', () => {
  it('informa la aprobación de una liga con la nota del administrador', () => {
    const msg = leagueReviewed({ leagueId: 'L1', name: 'Liga del Sinú', status: 'REJECTED', note: 'Falta información' });
    expect(msg.body).toContain('fue rechazada');
    expect(msg.body).toContain('Falta información');
    expect(msg.link).toBe('/panel/ligas/L1');
  });

  it('describe la jornada publicada', () => {
    const msg = roundPublished({ leagueId: 'L1', leagueName: 'Liga', categoryName: 'Libre', round: 3, matches: [1, 2, 3] });
    expect(msg.title).toBe('Jornada 3 programada');
    expect(msg.body).toContain('3 partido(s)');
  });

  it('formatea la hora del partido en la zona horaria de la liga', () => {
    const msg = refereeAssigned({ matchId: 'M', label: 'Tigres vs Leones', scheduledAt: '2026-09-05T15:00:00.000Z' });
    expect(msg.body).toContain('Tigres vs Leones');
    expect(msg.body).toMatch(/10:00/);
  });

  it('distingue cambio de sede y de horario', () => {
    const base = { matchId: 'M', homeTeamName: 'A', awayTeamName: 'B', scheduledAt: '2026-09-05T15:00:00.000Z' };
    expect(matchRescheduled({ ...base, venueName: 'Norte', previousVenueName: 'Sur' }).title).toBe('Cambio de sede');
    expect(matchRescheduled({ ...base, venueName: 'Norte', previousVenueName: 'Norte' }).title).toBe('Cambio de horario');
  });

  it('muestra el resultado final o corregido', () => {
    expect(finalResult({ matchId: 'M', homeScore: 2, awayScore: 1 }, 'Tigres', 'Leones').body).toBe('Tigres 2 - 1 Leones');
    expect(finalResult({ matchId: 'M', homeScore: 2, awayScore: 2, reason: 'correction' }, 'A', 'B').title).toBe('Resultado corregido');
  });
});
