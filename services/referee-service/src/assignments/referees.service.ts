import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { RefereeAssignment, ScheduledMatch } from '@prisma/client';
import { Counter } from 'prom-client';
import {
  EventBus,
  assertOwnerOrAdmin,
  env,
  envInt,
  isAdmin,
  registry,
  traceMatch,
  type AuthUser,
  type EventEnvelope,
} from '../chassis';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignDto,
  AvailabilityDto,
  CreateRefereeDto,
  ListAssignmentsQuery,
  ListRefereesQuery,
  UpdateRefereeDto,
} from './dto';
import { parseOffset, rankCandidates, type MatchSlot } from './matching';

const assignmentsTotal = new Counter({
  name: 'referee_assignments_total',
  help: 'Resultados de la asignación de árbitros',
  labelNames: ['outcome', 'mode'] as const,
  registers: [registry],
});

const ACTIVE: RefereeAssignment['status'][] = ['ASSIGNED', 'CONFIRMED'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PublishedMatch {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  venueName: string | null;
  venueZone: string | null;
  scheduledAt: string;
}

interface FixturePublished {
  leagueId: string;
  leagueName: string;
  categoryId: string;
  ownerId: string;
  round: number;
  matches: PublishedMatch[];
}

interface MatchRescheduled {
  matchId: string;
  scheduledAt: string;
  venueName: string | null;
  venueZone: string | null;
}

function minutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class RefereesService implements OnModuleInit {
  private readonly offsetMinutes = parseOffset(env('LEAGUE_UTC_OFFSET', '-05:00'));
  private readonly matchMinutes = envInt('REFEREE_MATCH_MINUTES', 120);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBus,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe<FixturePublished>('fixture.published', (event) => this.onFixturePublished(event));
    this.bus.subscribe<MatchRescheduled>('match.rescheduled', (event) => this.onMatchRescheduled(event));
    this.bus.subscribe<{ matchId: string }>('match.suspended', (event) => this.setProjectionStatus(event.data.matchId, 'SUSPENDED'));
    this.bus.subscribe<{ matchId: string }>('match.completed', (event) => this.setProjectionStatus(event.data.matchId, 'FINISHED'));
  }

  // ---------- Árbitros ----------

  async create(dto: CreateRefereeDto, user: AuthUser) {
    this.assertWindows(dto.availability);
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.referee.findUnique({ where: { ownerId_email: { ownerId: user.id, email } } });
    if (exists) throw new ConflictException('Ya registraste un árbitro con ese correo');
    return this.prisma.referee.create({
      data: {
        ownerId: user.id,
        leagueId: dto.leagueId ?? null,
        name: dto.name.trim(),
        email,
        phone: dto.phone?.trim() || null,
        zone: dto.zone.trim(),
        categoriesCertified: dto.categoriesCertified ?? [],
        availability: { create: dto.availability.map((a) => ({ ...a })) },
      },
      include: { availability: true },
    });
  }

  list(query: ListRefereesQuery, user: AuthUser) {
    return this.prisma.referee.findMany({
      where: {
        ...(isAdmin(user) ? {} : { ownerId: user.id }),
        ...(query.leagueId ? { OR: [{ leagueId: query.leagueId }, { leagueId: null }] } : {}),
      },
      include: {
        availability: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        _count: { select: { assignments: { where: { status: { in: ACTIVE } } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Perfiles de árbitro enlazados al correo de la cuenta que inició sesión. */
  myProfiles(user: AuthUser) {
    return this.prisma.referee.findMany({
      where: { email: user.email.toLowerCase() },
      include: { availability: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } },
    });
  }

  async update(id: string, dto: UpdateRefereeDto, user: AuthUser) {
    const referee = await this.ownedReferee(id, user);
    return this.prisma.referee.update({
      where: { id: referee.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.zone ? { zone: dto.zone.trim() } : {}),
        ...(dto.categoriesCertified ? { categoriesCertified: dto.categoriesCertified } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: { availability: true },
    });
  }

  async remove(id: string, user: AuthUser) {
    const referee = await this.ownedReferee(id, user);
    await this.prisma.referee.delete({ where: { id: referee.id } });
    return { ok: true };
  }

  /** PUT /referees/{id}/availability — la puede declarar el organizador o el propio árbitro. */
  async replaceAvailability(id: string, availability: AvailabilityDto[], user: AuthUser) {
    const referee = await this.prisma.referee.findUnique({ where: { id } });
    if (!referee) throw new NotFoundException('Árbitro no encontrado');
    const isSelf = referee.email === user.email.toLowerCase();
    if (!isSelf) assertOwnerOrAdmin(user, referee.ownerId, 'Solo el organizador o el propio árbitro pueden cambiar la disponibilidad');
    this.assertWindows(availability);
    await this.prisma.$transaction([
      this.prisma.availability.deleteMany({ where: { refereeId: id } }),
      this.prisma.availability.createMany({ data: availability.map((a) => ({ ...a, refereeId: id })) }),
    ]);
    return this.prisma.referee.findUnique({ where: { id }, include: { availability: true } });
  }

  async refereeAssignments(id: string, user: AuthUser) {
    const referee = await this.prisma.referee.findUnique({ where: { id } });
    if (!referee) throw new NotFoundException('Árbitro no encontrado');
    if (referee.email !== user.email.toLowerCase()) assertOwnerOrAdmin(user, referee.ownerId);
    return this.withMatches(
      await this.prisma.refereeAssignment.findMany({ where: { refereeId: id }, orderBy: { scheduledAt: 'asc' } }),
    );
  }

  // ---------- Asignaciones ----------

  async myAssignments(user: AuthUser) {
    const assignments = await this.prisma.refereeAssignment.findMany({
      where: { referee: { email: user.email.toLowerCase() } },
      include: { referee: { select: { id: true, name: true, email: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
    return this.withMatches(assignments);
  }

  async listAssignments(query: ListAssignmentsQuery, user: AuthUser) {
    const matchIds = query.matchIds
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id));
    const projections = await this.prisma.scheduledMatch.findMany({
      where: {
        ...(isAdmin(user) ? {} : { ownerId: user.id }),
        ...(query.leagueId ? { leagueId: query.leagueId } : {}),
        ...(matchIds?.length ? { matchId: { in: matchIds } } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
    });
    const assignments = await this.prisma.refereeAssignment.findMany({
      where: { matchId: { in: projections.map((p) => p.matchId) }, status: { in: ACTIVE } },
      include: { referee: { select: { id: true, name: true, email: true, zone: true } } },
    });
    const byMatch = new Map(assignments.map((a) => [a.matchId, a]));
    return projections.map((match) => ({ match, assignment: byMatch.get(match.matchId) ?? null }));
  }

  async assignManually(dto: AssignDto, user: AuthUser) {
    const match = await this.prisma.scheduledMatch.findUnique({ where: { matchId: dto.matchId } });
    if (!match) throw new NotFoundException('El partido no está publicado o no existe');
    assertOwnerOrAdmin(user, match.ownerId);
    const referee = await this.prisma.referee.findUnique({ where: { id: dto.refereeId } });
    if (!referee || referee.ownerId !== match.ownerId) throw new BadRequestException('El árbitro no pertenece a este organizador');
    if (!referee.active) throw new BadRequestException('El árbitro está inactivo');

    await this.prisma.refereeAssignment.deleteMany({ where: { matchId: dto.matchId } });
    const assignment = await this.prisma.refereeAssignment.create({
      data: { matchId: dto.matchId, refereeId: referee.id, scheduledAt: match.scheduledAt, manual: true },
    });
    assignmentsTotal.inc({ outcome: 'assigned', mode: 'manual' });
    traceMatch(dto.matchId, 'referee_assigned_manually', { refereeId: referee.id });
    await this.publishAssigned(assignment, referee, match, true);
    return assignment;
  }

  async autoAssignLeague(leagueId: string, user: AuthUser) {
    const pending = await this.prisma.scheduledMatch.findMany({
      where: { leagueId, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
    });
    if (pending[0]) assertOwnerOrAdmin(user, pending[0].ownerId);
    let assigned = 0;
    let unassigned = 0;
    for (const match of pending) {
      const active = await this.prisma.refereeAssignment.findFirst({ where: { matchId: match.matchId, status: { in: ACTIVE } } });
      if (active) continue;
      if (await this.autoAssign(match)) assigned += 1;
      else unassigned += 1;
    }
    return { assigned, unassigned };
  }

  /** PUT /assignments/{id}/confirm — el árbitro confirma o rechaza; si rechaza se busca reemplazo. */
  async confirm(id: string, confirmed: boolean, user: AuthUser) {
    const assignment = await this.prisma.refereeAssignment.findUnique({ where: { id }, include: { referee: true } });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    const isSelf = assignment.referee.email === user.email.toLowerCase();
    if (!isSelf && !isAdmin(user) && assignment.referee.ownerId !== user.id) {
      throw new ForbiddenException('Solo el árbitro asignado puede confirmar este partido');
    }
    const updated = await this.prisma.refereeAssignment.update({
      where: { id },
      data: { confirmed, status: confirmed ? 'CONFIRMED' : 'DECLINED' },
    });
    traceMatch(assignment.matchId, confirmed ? 'referee_confirmed' : 'referee_declined', { refereeId: assignment.refereeId });
    if (!confirmed) {
      const match = await this.prisma.scheduledMatch.findUnique({ where: { matchId: assignment.matchId } });
      if (match) await this.autoAssign(match);
    }
    return updated;
  }

  async removeAssignment(id: string, user: AuthUser) {
    const assignment = await this.prisma.refereeAssignment.findUnique({ where: { id }, include: { referee: true } });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    assertOwnerOrAdmin(user, assignment.referee.ownerId);
    await this.prisma.refereeAssignment.delete({ where: { id } });
    return { ok: true };
  }

  /** Consulta interna del Live Score Service: ¿este árbitro tiene asignado el partido? */
  async check(matchId: string, email: string) {
    const assignment = await this.prisma.refereeAssignment.findFirst({
      where: { matchId, status: { in: ACTIVE }, referee: { email: email.toLowerCase(), active: true } },
      include: { referee: { select: { name: true } } },
    });
    return { assigned: !!assignment, refereeName: assignment?.referee.name ?? null };
  }

  // ---------- Consumidores de eventos ----------

  async onFixturePublished(event: EventEnvelope<FixturePublished>): Promise<void> {
    const { data } = event;
    const matches = [...data.matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    for (const match of matches) {
      const projection = await this.prisma.scheduledMatch.upsert({
        where: { matchId: match.matchId },
        create: {
          matchId: match.matchId,
          leagueId: data.leagueId,
          leagueName: data.leagueName,
          categoryId: data.categoryId,
          ownerId: data.ownerId,
          round: data.round,
          label: `${match.homeTeamName} vs ${match.awayTeamName}`,
          scheduledAt: new Date(match.scheduledAt),
          venueName: match.venueName,
          venueZone: match.venueZone,
        },
        update: {
          scheduledAt: new Date(match.scheduledAt),
          venueName: match.venueName,
          venueZone: match.venueZone,
          label: `${match.homeTeamName} vs ${match.awayTeamName}`,
        },
      });
      // Idempotencia: si el evento llega dos veces no se duplica la asignación.
      const active = await this.prisma.refereeAssignment.findFirst({ where: { matchId: match.matchId, status: { in: ACTIVE } } });
      if (!active) await this.autoAssign(projection);
    }
  }

  async onMatchRescheduled(event: EventEnvelope<MatchRescheduled>): Promise<void> {
    const { data } = event;
    const projection = await this.prisma.scheduledMatch
      .update({
        where: { matchId: data.matchId },
        data: { scheduledAt: new Date(data.scheduledAt), venueName: data.venueName, venueZone: data.venueZone, status: 'SCHEDULED' },
      })
      .catch(() => null);
    if (!projection) return;
    const active = await this.prisma.refereeAssignment.findFirst({
      where: { matchId: data.matchId, status: { in: ACTIVE } },
      include: { referee: { include: { availability: true } } },
    });
    if (active) {
      const busy = await this.busySlots([active.refereeId], projection);
      const stillFits = rankCandidates(this.slotOf(projection), [active.referee], busy, this.options()).length > 0;
      if (stillFits) {
        await this.prisma.refereeAssignment.update({ where: { id: active.id }, data: { scheduledAt: projection.scheduledAt } });
        traceMatch(data.matchId, 'referee_assignment_kept_after_reschedule', { refereeId: active.refereeId });
        return;
      }
      await this.prisma.refereeAssignment.delete({ where: { id: active.id } });
      traceMatch(data.matchId, 'referee_unavailable_after_reschedule', { refereeId: active.refereeId });
    }
    await this.autoAssign(projection);
  }

  // ---------- utilidades ----------

  private async autoAssign(match: ScheduledMatch): Promise<boolean> {
    const declined = await this.prisma.refereeAssignment.findMany({
      where: { matchId: match.matchId, status: 'DECLINED' },
      select: { refereeId: true },
    });
    const referees = await this.prisma.referee.findMany({ where: { ownerId: match.ownerId, active: true }, include: { availability: true } });
    const busy = await this.busySlots(
      referees.map((r) => r.id),
      match,
    );
    const [best] = rankCandidates(this.slotOf(match), referees, busy, {
      ...this.options(),
      excludeRefereeIds: declined.map((d) => d.refereeId),
    });

    if (!best) {
      assignmentsTotal.inc({ outcome: 'unassigned', mode: 'auto' });
      traceMatch(match.matchId, 'referee_unassigned', { reason: 'sin árbitros disponibles' });
      await this.bus.publish('referee.unassigned', {
        matchId: match.matchId,
        leagueId: match.leagueId,
        leagueName: match.leagueName,
        ownerId: match.ownerId,
        label: match.label,
        scheduledAt: match.scheduledAt.toISOString(),
        reason: 'No hay árbitros disponibles para ese día, horario, zona o categoría',
      });
      return false;
    }

    const assignment = await this.prisma.refereeAssignment.upsert({
      where: { matchId_refereeId: { matchId: match.matchId, refereeId: best.id } },
      create: { matchId: match.matchId, refereeId: best.id, scheduledAt: match.scheduledAt },
      update: { scheduledAt: match.scheduledAt, status: 'ASSIGNED', confirmed: false },
    });
    assignmentsTotal.inc({ outcome: 'assigned', mode: 'auto' });
    traceMatch(match.matchId, 'referee_assigned', { refereeId: best.id, zone: best.zone });
    await this.publishAssigned(assignment, best, match, false);
    return true;
  }

  private async publishAssigned(
    assignment: RefereeAssignment,
    referee: { id: string; name: string; email?: string },
    match: ScheduledMatch,
    manual: boolean,
  ) {
    const email = referee.email ?? (await this.prisma.referee.findUnique({ where: { id: referee.id } }))?.email ?? '';
    await this.bus.publish('referee.assigned', {
      assignmentId: assignment.id,
      matchId: match.matchId,
      refereeId: referee.id,
      refereeName: referee.name,
      refereeEmail: email,
      leagueId: match.leagueId,
      leagueName: match.leagueName,
      ownerId: match.ownerId,
      label: match.label,
      scheduledAt: match.scheduledAt.toISOString(),
      venueName: match.venueName,
      manual,
    });
  }

  private async busySlots(refereeIds: string[], match: ScheduledMatch) {
    if (refereeIds.length === 0) return [];
    const day = 24 * 3600 * 1000;
    const rows = await this.prisma.refereeAssignment.findMany({
      where: {
        refereeId: { in: refereeIds },
        status: { in: ACTIVE },
        scheduledAt: { gte: new Date(match.scheduledAt.getTime() - 30 * day), lte: new Date(match.scheduledAt.getTime() + 30 * day) },
      },
      select: { refereeId: true, matchId: true, scheduledAt: true },
    });
    return rows;
  }

  private slotOf(match: ScheduledMatch): MatchSlot {
    return {
      matchId: match.matchId,
      ownerId: match.ownerId,
      leagueId: match.leagueId,
      categoryId: match.categoryId,
      scheduledAt: match.scheduledAt,
      venueZone: match.venueZone,
    };
  }

  private options() {
    return { offsetMinutes: this.offsetMinutes, matchMinutes: this.matchMinutes };
  }

  private async setProjectionStatus(matchId: string, status: string): Promise<void> {
    await this.prisma.scheduledMatch.updateMany({ where: { matchId }, data: { status } });
  }

  private async withMatches<T extends { matchId: string }>(assignments: T[]) {
    const projections = await this.prisma.scheduledMatch.findMany({
      where: { matchId: { in: assignments.map((a) => a.matchId) } },
    });
    const byId = new Map(projections.map((p) => [p.matchId, p]));
    return assignments.map((assignment) => ({ ...assignment, match: byId.get(assignment.matchId) ?? null }));
  }

  private async ownedReferee(id: string, user: AuthUser) {
    const referee = await this.prisma.referee.findUnique({ where: { id } });
    if (!referee) throw new NotFoundException('Árbitro no encontrado');
    assertOwnerOrAdmin(user, referee.ownerId, 'Solo el organizador que registró al árbitro puede modificarlo');
    return referee;
  }

  private assertWindows(windows: AvailabilityDto[]): void {
    for (const window of windows) {
      if (minutes(window.startTime) >= minutes(window.endTime)) {
        throw new BadRequestException('En la disponibilidad, la hora inicial debe ser anterior a la final');
      }
    }
  }
}
