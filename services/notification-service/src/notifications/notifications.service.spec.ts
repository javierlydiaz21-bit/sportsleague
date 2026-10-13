import { InMemoryEventBus, buildEnvelope } from '../chassis';
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
  };
  const service = new NotificationsService(prisma, new InMemoryEventBus());
  return { service, notifications, deliveries };
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
});
