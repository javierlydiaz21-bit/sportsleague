import { InMemoryEventBus, buildEnvelope } from '../chassis';
import { Mailer } from './mailer';
import { NotificationsService } from './notifications.service';

process.env.LOG_LEVEL = 'error';

function setup() {
  const notifications: any[] = [];
  const deliveries: any[] = [];
  const prisma: any = {
    notification: {
      createMany: jest.fn(async ({ data }) => {
        const fresh = data.filter((row: any) => !notifications.some((n) => n.dedupeKey === row.dedupeKey));
        notifications.push(...fresh);
        return { count: fresh.length };
      }),
    },
    delivery: { createMany: jest.fn(async ({ data }) => deliveries.push(...data)) },
    subscription: { findMany: jest.fn(async () => [{ userId: 'fan-1', email: 'fan@liga.com' }]) },
    preference: { findMany: jest.fn(async (): Promise<{ userId: string }[]> => []) },
  };
  const mailer = { send: jest.fn(async () => 'SENT') } as unknown as Mailer;
  const service = new NotificationsService(prisma, new InMemoryEventBus(), mailer);
  return { service, notifications, deliveries, mailer, prisma };
}

describe('NotificationsService', () => {
  it('avisa a los administradores cuando se crea una liga', async () => {
    const { service, notifications } = setup();
    const event = buildEnvelope('league.created', { leagueId: 'L1', name: 'Liga del Sinú', ownerName: 'Ana' });
    await service.notify(event, [{ role: 'ADMIN' }], { type: 'LEAGUE_PENDING', title: 't', body: 'b' });
    expect(notifications).toEqual([expect.objectContaining({ role: 'ADMIN', type: 'LEAGUE_PENDING' })]);
  });

  it('no duplica notificaciones si el mismo evento llega dos veces', async () => {
    const { service, notifications } = setup();
    const event = buildEnvelope('league.reviewed', { leagueId: 'L1', ownerId: 'owner-1' });
    const message = { type: 'LEAGUE_APPROVED', title: 't', body: 'b' };
    await service.notify(event, [{ userId: 'owner-1' }], message);
    await service.notify(event, [{ userId: 'owner-1' }], message);
    expect(notifications).toHaveLength(1);
  });

  it('notifica al organizador y a los aficionados de la liga, y registra los envíos', async () => {
    const { service, notifications, deliveries } = setup();
    const event = buildEnvelope('fixture.published', { leagueId: 'L1', ownerId: 'owner-1' });
    await service.toLeagueAudience(event, { type: 'FIXTURE_PUBLISHED', title: 'Jornada 1', body: 'b' });
    expect(notifications.map((n) => n.userId).sort()).toEqual(['fan-1', 'owner-1']);
    expect(deliveries.map((d) => d.channel).sort()).toEqual(['EMAIL', 'PUSH', 'PUSH']);
  });

  it('envía el correo de los aficionados con el enlace completo y guarda el resultado', async () => {
    const { service, deliveries, mailer } = setup();
    const event = buildEnvelope('match.completed', { leagueId: 'L1', ownerId: 'owner-1', matchId: 'M1' });
    await service.toLeagueAudience(event, { type: 'MATCH_RESULT', title: 'Final', body: 'Leones 2 - 1 Tigres', link: '/partidos/M1' });
    expect(mailer.send).toHaveBeenCalledWith('fan@liga.com', 'Final', expect.stringContaining('http://localhost:3000/partidos/M1'));
    expect(deliveries.find((d) => d.channel === 'EMAIL')).toMatchObject({ recipient: 'fan@liga.com', status: 'SENT' });
  });

  it('respeta las preferencias: sin correo ni push para quien los desactivó', async () => {
    const { service, notifications, deliveries, mailer, prisma } = setup();
    prisma.preference.findMany.mockResolvedValue([{ userId: 'fan-1' }]);
    const event = buildEnvelope('fixture.published', { leagueId: 'L1', ownerId: 'owner-1' });
    await service.toLeagueAudience(event, { type: 'FIXTURE_PUBLISHED', title: 'Jornada 1', body: 'b' });
    expect(notifications.map((n) => n.userId).sort()).toEqual(['fan-1', 'owner-1']); // la bandeja no depende de las preferencias
    expect(mailer.send).not.toHaveBeenCalled();
    expect(deliveries).toEqual([expect.objectContaining({ channel: 'PUSH', recipient: 'owner-1' })]);
  });
});
