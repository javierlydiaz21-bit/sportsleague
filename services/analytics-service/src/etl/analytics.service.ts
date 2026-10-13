import { ForbiddenException, Injectable } from '@nestjs/common';
import { assertOwnerOrAdmin, type AuthUser } from '../chassis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [kpis, runs, attendanceCount] = await Promise.all([
      this.prisma.leagueKpi.findMany({ orderBy: { totalMatches: 'desc' } }),
      this.prisma.etlRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 }),
      this.prisma.attendanceEstimate.aggregate({ _sum: { estimatedAttendance: true }, _avg: { estimatedAttendance: true } }),
    ]);
    const sum = (field: 'totalMatches' | 'finished' | 'suspended' | 'live' | 'scheduled' | 'totalGoals' | 'totalCards') =>
      kpis.reduce((total, row) => total + row[field], 0);
    const finished = sum('finished');
    return {
      totals: {
        leaguesWithMatches: kpis.length,
        matches: sum('totalMatches'),
        scheduled: sum('scheduled'),
        live: sum('live'),
        finished,
        suspended: sum('suspended'),
        goals: sum('totalGoals'),
        cards: sum('totalCards'),
        avgGoalsPerMatch: finished ? Math.round((sum('totalGoals') / finished) * 100) / 100 : 0,
        totalAttendance: attendanceCount._sum.estimatedAttendance ?? 0,
        avgAttendance: Math.round((attendanceCount._avg.estimatedAttendance ?? 0) * 10) / 10,
      },
      leagues: kpis,
      lastRuns: runs,
    };
  }

  async league(leagueId: string, user: AuthUser) {
    const kpi = await this.prisma.leagueKpi.findUnique({ where: { leagueId } });
    if (!kpi) {
      if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') throw new ForbiddenException('No tienes acceso a esta analítica');
      return { kpi: null, attendance: [], suspended: [], computedAt: null };
    }
    assertOwnerOrAdmin(user, kpi.ownerId);
    const [attendance, suspended] = await Promise.all([
      this.prisma.attendanceEstimate.findMany({ where: { leagueId }, orderBy: { scheduledAt: 'asc' } }),
      this.prisma.suspendedMatch.findMany({ where: { leagueId }, orderBy: { scheduledAt: 'asc' } }),
    ]);
    return { kpi, attendance, suspended, computedAt: kpi.computedAt };
  }

  async attendance(leagueId: string, user: AuthUser) {
    await this.assertLeagueAccess(leagueId, user);
    return this.prisma.attendanceEstimate.findMany({ where: { leagueId }, orderBy: { scheduledAt: 'asc' } });
  }

  async suspended(leagueId: string, user: AuthUser) {
    await this.assertLeagueAccess(leagueId, user);
    return this.prisma.suspendedMatch.findMany({ where: { leagueId }, orderBy: { scheduledAt: 'asc' } });
  }

  trend(teamId: string, seasonId?: string) {
    return this.prisma.teamPerformanceTrend.findMany({
      where: { teamId, ...(seasonId ? { seasonId } : {}) },
      orderBy: [{ seasonId: 'asc' }, { matchIndex: 'asc' }],
    });
  }

  runs() {
    return this.prisma.etlRun.findMany({ orderBy: { startedAt: 'desc' }, take: 30 });
  }

  private async assertLeagueAccess(leagueId: string, user: AuthUser): Promise<void> {
    const kpi = await this.prisma.leagueKpi.findUnique({ where: { leagueId }, select: { ownerId: true } });
    if (kpi) assertOwnerOrAdmin(user, kpi.ownerId);
  }
}
