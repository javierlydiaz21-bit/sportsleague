import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Player, Prisma, Team } from '@prisma/client';
import { assertOwnerOrAdmin, isAdmin, isOwnerOrAdmin, log, type AuthUser } from '../chassis';
import { LeagueClient } from '../clients/league.client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkPlayersDto,
  CreatePlayerDto,
  CreateTeamDto,
  EligibilityDto,
  ListPlayersQuery,
  ListTeamsQuery,
  UpdatePlayerDto,
  UpdateTeamDto,
} from './dto';
import { colorFor, evaluateEligibility } from './eligibility';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIds(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => UUID_RE.test(id));
  return ids.length ? ids.slice(0, 200) : undefined;
}

function toDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** Datos públicos del jugador: el documento de identidad solo lo ve el organizador o el admin. */
function publicPlayer(player: Player, canSeePrivate: boolean) {
  if (canSeePrivate) return player;
  const { documentId: _documentId, registrationDocUrl: _doc, ...rest } = player;
  return rest;
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly league: LeagueClient,
  ) {}

  // ---------- Equipos ----------

  async create(dto: CreateTeamDto, user: AuthUser) {
    const category = await this.league.category(dto.categoryId, user);
    assertOwnerOrAdmin(user, category.league.ownerId, 'Solo el organizador de la liga puede registrar equipos');
    if (category.league.status === 'REJECTED' || category.league.status === 'SUSPENDED') {
      throw new ConflictException('La liga no está activa; no se pueden registrar equipos');
    }
    if (dto.homeVenueId) await this.assertVenueInLeague(dto.homeVenueId, category.league.id);

    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        leagueId: category.league.id,
        categoryId: dto.categoryId,
        ownerId: category.league.ownerId,
        homeVenueId: dto.homeVenueId ?? null,
        coachName: dto.coachName?.trim() || null,
        contactEmail: dto.contactEmail?.trim().toLowerCase() || null,
        color: dto.color ?? colorFor(dto.name),
      },
    });
    log.info('team_registered', { teamId: team.id, categoryId: team.categoryId });
    return team;
  }

  list(query: ListTeamsQuery) {
    const ids = parseIds(query.ids);
    const where: Prisma.TeamWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(ids ? { id: { in: ids } } : {}),
    };
    if (!query.categoryId && !query.leagueId && !ids) {
      throw new BadRequestException('Indica categoryId, leagueId o ids para listar equipos');
    }
    return this.prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { players: true } } },
    });
  }

  async get(id: string, user?: AuthUser) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { players: { orderBy: [{ jerseyNumber: 'asc' }, { lastName: 'asc' }] } },
    });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    const canSeePrivate = isOwnerOrAdmin(user, team.ownerId);
    return { ...team, players: team.players.map((p) => publicPlayer(p, canSeePrivate)) };
  }

  async update(id: string, dto: UpdateTeamDto, user: AuthUser) {
    const team = await this.ownedTeam(id, user);
    if (dto.homeVenueId) await this.assertVenueInLeague(dto.homeVenueId, team.leagueId);
    return this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.homeVenueId !== undefined ? { homeVenueId: dto.homeVenueId } : {}),
        ...(dto.coachName !== undefined ? { coachName: dto.coachName.trim() || null } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail.trim().toLowerCase() || null } : {}),
        ...(dto.color ? { color: dto.color } : {}),
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.ownedTeam(id, user);
    await this.prisma.team.delete({ where: { id } });
    log.info('team_deleted', { teamId: id });
    return { ok: true };
  }

  // ---------- Jugadores ----------

  async addPlayer(teamId: string, dto: CreatePlayerDto, user: AuthUser) {
    const team = await this.ownedTeam(teamId, user);
    const range = await this.league.ageRange(team.categoryId, user);
    return this.prisma.player.create({ data: this.playerData(team, dto, range) });
  }

  async addPlayersBulk(teamId: string, dto: BulkPlayersDto, user: AuthUser) {
    const team = await this.ownedTeam(teamId, user);
    const numbers = dto.players.map((p) => p.jerseyNumber).filter((n): n is number => n !== undefined);
    if (new Set(numbers).size !== numbers.length) {
      throw new BadRequestException('Hay números de camiseta repetidos en la lista');
    }
    const range = await this.league.ageRange(team.categoryId, user);
    const created = await this.prisma.$transaction(
      dto.players.map((player) => this.prisma.player.create({ data: this.playerData(team, player, range) })),
    );
    log.info('players_bulk_registered', { teamId, count: created.length });
    return created;
  }

  async listPlayers(teamId: string, user?: AuthUser) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    const players = await this.prisma.player.findMany({
      where: { teamId },
      orderBy: [{ jerseyNumber: 'asc' }, { lastName: 'asc' }],
    });
    const canSeePrivate = isOwnerOrAdmin(user, team.ownerId);
    return players.map((p) => publicPlayer(p, canSeePrivate));
  }

  async queryPlayers(query: ListPlayersQuery) {
    const ids = parseIds(query.ids);
    const teamIds = parseIds(query.teamIds);
    if (!ids && !teamIds) throw new BadRequestException('Indica ids o teamIds');
    const players = await this.prisma.player.findMany({
      where: { ...(ids ? { id: { in: ids } } : {}), ...(teamIds ? { teamId: { in: teamIds } } : {}) },
      orderBy: [{ teamId: 'asc' }, { jerseyNumber: 'asc' }],
    });
    return players.map((p) => publicPlayer(p, false));
  }

  async getPlayer(id: string, user?: AuthUser) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { team: { select: { id: true, name: true, categoryId: true, leagueId: true, ownerId: true, color: true } } },
    });
    if (!player) throw new NotFoundException('Jugador no encontrado');
    const { team, ...rest } = player;
    return { ...publicPlayer(rest, isOwnerOrAdmin(user, team.ownerId)), team };
  }

  async updatePlayer(id: string, dto: UpdatePlayerDto, user: AuthUser) {
    const { player, team } = await this.ownedPlayer(id, user);
    let eligibility: { eligibilityStatus: Player['eligibilityStatus']; eligibilityNote: string } | undefined;
    if (dto.birthDate) {
      const result = evaluateEligibility(toDate(dto.birthDate), await this.league.ageRange(team.categoryId, user));
      eligibility = { eligibilityStatus: result.status, eligibilityNote: result.note };
    }
    return this.prisma.player.update({
      where: { id: player.id },
      data: {
        ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.birthDate ? { birthDate: toDate(dto.birthDate) } : {}),
        ...(dto.jerseyNumber !== undefined ? { jerseyNumber: dto.jerseyNumber } : {}),
        ...(dto.position !== undefined ? { position: dto.position.trim() || null } : {}),
        ...(dto.documentId !== undefined ? { documentId: dto.documentId.trim() || null } : {}),
        ...(dto.registrationDocUrl !== undefined ? { registrationDocUrl: dto.registrationDocUrl || null } : {}),
        ...(eligibility ?? {}),
      },
    });
  }

  async removePlayer(id: string, user: AuthUser) {
    const { player } = await this.ownedPlayer(id, user);
    await this.prisma.player.delete({ where: { id: player.id } });
    return { ok: true };
  }

  /**
   * PUT /players/{id}/eligibility: el organizador revalida automáticamente; el
   * administrador puede además aprobar o rechazar manualmente tras revisar documentos.
   */
  async setEligibility(id: string, dto: EligibilityDto, user: AuthUser) {
    const { player, team } = await this.ownedPlayer(id, user);
    if (dto.status) {
      if (!isAdmin(user)) {
        throw new BadRequestException('Solo el administrador puede fijar la elegibilidad manualmente');
      }
      const note = `Revisión manual del administrador${dto.note ? `: ${dto.note.trim()}` : ''}`;
      log.info('eligibility_override', { playerId: id, status: dto.status, adminId: user.id });
      return this.prisma.player.update({ where: { id }, data: { eligibilityStatus: dto.status, eligibilityNote: note } });
    }
    const result = evaluateEligibility(player.birthDate, await this.league.ageRange(team.categoryId, user));
    return this.prisma.player.update({
      where: { id },
      data: { eligibilityStatus: result.status, eligibilityNote: result.note },
    });
  }

  // ---------- utilidades ----------

  private playerData(
    team: Team,
    dto: CreatePlayerDto,
    range: Awaited<ReturnType<LeagueClient['ageRange']>>,
  ): Prisma.PlayerUncheckedCreateInput {
    const birthDate = toDate(dto.birthDate);
    const eligibility = evaluateEligibility(birthDate, range);
    return {
      teamId: team.id,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      birthDate,
      jerseyNumber: dto.jerseyNumber ?? null,
      position: dto.position?.trim() || null,
      documentId: dto.documentId?.trim() || null,
      registrationDocUrl: dto.registrationDocUrl || null,
      eligibilityStatus: eligibility.status,
      eligibilityNote: eligibility.note,
    };
  }

  private async ownedTeam(id: string, user: AuthUser): Promise<Team> {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    assertOwnerOrAdmin(user, team.ownerId, 'Solo el organizador de la liga puede modificar este equipo');
    return team;
  }

  private async ownedPlayer(id: string, user: AuthUser): Promise<{ player: Player; team: Team }> {
    const player = await this.prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) throw new NotFoundException('Jugador no encontrado');
    assertOwnerOrAdmin(user, player.team.ownerId, 'Solo el organizador de la liga puede modificar este jugador');
    const { team, ...rest } = player;
    return { player: rest, team };
  }

  private async assertVenueInLeague(venueId: string, leagueId: string): Promise<void> {
    const venue = await this.league.venue(venueId);
    if (venue.leagueId !== leagueId) throw new BadRequestException('La cancha seleccionada no pertenece a esta liga');
  }
}
