import { randomUUID } from 'node:crypto';

type Row = Record<string, any>;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) =>
    value === null ? row[key] === null || row[key] === undefined : row[key] === value,
  );
}

/** Prisma en memoria con las operaciones que usa el Auth Service. */
export function createFakePrisma() {
  const users: Row[] = [];
  const tokens: Row[] = [];
  const prisma: any = {
    user: {
      findUnique: async ({ where }: { where: Row }) =>
        users.find((u) => (where.id && u.id === where.id) || (where.email && u.email === where.email)) ?? null,
      create: async ({ data }: { data: Row }) => {
        const user = {
          id: randomUUID(),
          role: 'ORGANIZER',
          status: 'ACTIVE',
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        users.push(user);
        return user;
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const user = users.find((u) => u.id === where.id);
        if (!user) throw Object.assign(new Error('not found'), { code: 'P2025' });
        Object.assign(user, data);
        return user;
      },
    },
    refreshToken: {
      create: async ({ data }: { data: Row }) => {
        const token = { id: randomUUID(), revokedAt: null, replacedBy: null, createdAt: new Date(), ...data };
        tokens.push(token);
        return token;
      },
      findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
        const token = tokens.find((t) => t.tokenHash === where.tokenHash);
        if (!token) return null;
        return include?.user ? { ...token, user: users.find((u) => u.id === token.userId) } : token;
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const token = tokens.find((t) => t.id === where.id);
        Object.assign(token ?? {}, data);
        return token;
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const selected = tokens.filter((t) => matches(t, where));
        selected.forEach((t) => Object.assign(t, data));
        return { count: selected.length };
      },
    },
    $transaction: async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
    _users: users,
    _tokens: tokens,
  };
  return prisma;
}
