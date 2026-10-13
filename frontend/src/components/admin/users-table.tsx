'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL, errorMessage, formatDate, relativeTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Role, User } from '@/lib/types';
import { useToast } from '../overlay';
import { Badge, Button, Input, Pills, Select, Table, Td, Th } from '../ui';

const ROLE_FILTERS: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ORGANIZER', label: 'Organizadores' },
  { value: 'REFEREE', label: 'Árbitros' },
  { value: 'SPECTATOR', label: 'Aficionados' },
  { value: 'ADMIN', label: 'Administradores' },
];

export function UsersTable() {
  const { api, user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const { data, reload } = useAsync(
    () => api.get<{ items: User[]; total: number }>(`/users?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}${role === 'ALL' ? '' : `&role=${role}`}`),
    [api, query, role],
  );

  const update = async (user: User, patch: { role?: Role; status?: User['status'] }, message: string) => {
    try {
      await api.patch(`/users/${user.id}`, patch);
      await reload();
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Pills options={ROLE_FILTERS} value={role} onChange={setRole} />
        <form
          className="relative w-full sm:w-72"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" className="pl-9" />
        </form>
      </div>
      <p className="text-xs text-muted">{data?.total ?? 0} usuarios</p>
      <Table>
        <thead>
          <tr>
            <Th>Usuario</Th>
            <Th>Rol</Th>
            <Th>Estado</Th>
            <Th>Último acceso</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((user) => {
            const isMe = user.id === me?.id;
            return (
              <tr key={user.id}>
                <Td>
                  <p className="font-medium">
                    {user.name} {isMe && <span className="text-xs font-normal text-muted">(tú)</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {user.email} · desde {formatDate(user.createdAt)}
                  </p>
                </Td>
                <Td>
                  <Select
                    className="h-8 w-40 text-xs"
                    value={user.role}
                    disabled={isMe}
                    onChange={(e) => update(user, { role: e.target.value as Role }, `Rol actualizado a ${ROLE_LABEL[e.target.value as Role]}`)}
                  >
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>{user.status === 'ACTIVE' ? <Badge tone="green">Activa</Badge> : <Badge tone="red">Suspendida</Badge>}</Td>
                <Td className="text-xs text-muted">{user.lastLoginAt ? relativeTime(user.lastLoginAt) : 'Nunca'}</Td>
                <Td className="text-right">
                  {!isMe &&
                    (user.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          window.confirm(`¿Suspender la cuenta de ${user.name}? Perderá el acceso de inmediato.`) &&
                          update(user, { status: 'SUSPENDED' }, 'Cuenta suspendida')
                        }
                      >
                        Suspender
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => update(user, { status: 'ACTIVE' }, 'Cuenta reactivada')}>
                        Reactivar
                      </Button>
                    ))}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
