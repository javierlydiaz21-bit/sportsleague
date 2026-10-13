/**
 * Plantillas de mensajes (lógica pura). Separar las plantillas de los canales
 * de envío permite agregar canales nuevos (SMS, WhatsApp...) sin tocar esto.
 */

const TZ = process.env.LEAGUE_TIMEZONE ?? 'America/Bogota';

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

export interface Message {
  type: string;
  title: string;
  body: string;
  link?: string;
}

export function leagueCreated(data: { leagueId: string; name: string; ownerName?: string | null }): Message {
  return {
    type: 'LEAGUE_PENDING',
    title: 'Nueva liga pendiente de aprobación',
    body: `${data.ownerName ?? 'Un organizador'} creó la liga "${data.name}". Revísala para autorizarla.`,
    link: '/admin?tab=ligas',
  };
}

export function leagueReviewed(data: { leagueId: string; name: string; status: string; note?: string | null }): Message {
  const verdict: Record<string, string> = {
    APPROVED: 'fue aprobada. Ya es pública y puedes generar el calendario',
    REJECTED: 'fue rechazada',
    SUSPENDED: 'fue suspendida',
  };
  return {
    type: `LEAGUE_${data.status}`,
    title: data.status === 'APPROVED' ? 'Tu liga fue aprobada' : 'Actualización de tu liga',
    body: `La liga "${data.name}" ${verdict[data.status] ?? 'cambió de estado'}.${data.note ? ` Nota del administrador: ${data.note}` : ''}`,
    link: `/panel/ligas/${data.leagueId}`,
  };
}

export function userRegistered(data: { name: string; email: string; role: string }): Message {
  const roles: Record<string, string> = { ORGANIZER: 'organizador', REFEREE: 'árbitro', SPECTATOR: 'aficionado', ADMIN: 'administrador' };
  return {
    type: 'USER_REGISTERED',
    title: 'Nuevo usuario registrado',
    body: `${data.name} (${data.email}) se registró como ${roles[data.role] ?? data.role}.`,
    link: '/admin?tab=usuarios',
  };
}

export function roundPublished(data: { leagueId: string; leagueName: string; categoryName: string; round: number; matches: unknown[] }): Message {
  return {
    type: 'FIXTURE_PUBLISHED',
    title: `Jornada ${data.round} programada`,
    body: `${data.leagueName}${data.categoryName ? ` · ${data.categoryName}` : ''}: ${data.matches.length} partido(s) con horario confirmado.`,
    link: `/ligas/${data.leagueId}?tab=calendario`,
  };
}

export function refereeAssigned(data: { matchId: string; label: string; scheduledAt: string; venueName?: string | null; leagueName?: string | null }): Message {
  return {
    type: 'REFEREE_ASSIGNED',
    title: 'Tienes un partido asignado',
    body: `${data.label} · ${formatDate(data.scheduledAt)}${data.venueName ? ` · ${data.venueName}` : ''}. Confírmalo desde tu panel.`,
    link: '/panel/arbitro',
  };
}

export function refereeUnassigned(data: { matchId: string; label: string; scheduledAt: string; leagueId: string }): Message {
  return {
    type: 'REFEREE_UNASSIGNED',
    title: 'Partido sin árbitro',
    body: `No hay árbitros disponibles para ${data.label} (${formatDate(data.scheduledAt)}). Asígnalo manualmente.`,
    link: `/panel/ligas/${data.leagueId}?tab=arbitros`,
  };
}

export function matchRescheduled(data: {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  venueName: string | null;
  previousVenueName: string | null;
}): Message {
  const venueChanged = data.venueName && data.venueName !== data.previousVenueName;
  return {
    type: 'MATCH_RESCHEDULED',
    title: venueChanged ? 'Cambio de sede' : 'Cambio de horario',
    body: `${data.homeTeamName} vs ${data.awayTeamName}: ahora ${formatDate(data.scheduledAt)}${data.venueName ? ` en ${data.venueName}` : ''}.`,
    link: `/partidos/${data.matchId}`,
  };
}

export function matchSuspended(data: { matchId: string; reason: string }, label: string): Message {
  return {
    type: 'MATCH_SUSPENDED',
    title: 'Partido suspendido',
    body: `${label}: ${data.reason}`,
    link: `/partidos/${data.matchId}`,
  };
}

export function finalResult(data: { matchId: string; homeScore: number; awayScore: number; reason?: string }, home: string, away: string): Message {
  return {
    type: 'MATCH_RESULT',
    title: data.reason === 'correction' ? 'Resultado corregido' : 'Resultado final',
    body: `${home} ${data.homeScore} - ${data.awayScore} ${away}`,
    link: `/partidos/${data.matchId}`,
  };
}
