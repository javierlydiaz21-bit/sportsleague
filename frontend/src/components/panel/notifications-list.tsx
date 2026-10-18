'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { relativeTime } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import type { Notification } from '@/lib/types';
import { RequireAuth } from '../require-auth';
import { Button, Card, EmptyState, PageHeader, PageSpinner, cn } from '../ui';
import { PushToggle } from './push-toggle';

function Inbox() {
  const { api } = useAuth();
  const { data, loading, reload } = useAsync(() => api.get<{ items: Notification[]; unread: number }>('/notifications?limit=100'), [api]);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    await reload();
  };
  const markOne = async (notification: Notification) => {
    if (!notification.read) await api.patch(`/notifications/${notification.id}/read`).catch(() => undefined);
  };

  if (loading && !data) return <PageSpinner />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notificaciones"
        description={data?.unread ? `${data.unread} sin leer` : 'Estás al día'}
        actions={
          data?.unread ? (
            <Button variant="secondary" size="sm" onClick={markAll}>
              Marcar todo como leído
            </Button>
          ) : null
        }
      />
      <PushToggle />
      {!data || data.items.length === 0 ? (
        <EmptyState icon={<Bell className="h-5 w-5" />} title="Sin notificaciones" description="Aquí verás aprobaciones, jornadas publicadas, asignaciones y resultados." />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {data.items.map((notification) => {
            const content = (
              <div className="flex gap-3 px-4 py-3.5">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', notification.read ? 'bg-transparent' : 'bg-brand')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={cn('text-sm', notification.read ? 'text-muted' : 'font-medium')}>{notification.title}</p>
                    <span className="shrink-0 text-xs text-subtle">{relativeTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{notification.body}</p>
                </div>
              </div>
            );
            return notification.link ? (
              <Link key={notification.id} href={notification.link} onClick={() => void markOne(notification)} className="block transition hover:bg-surface">
                {content}
              </Link>
            ) : (
              <div key={notification.id} onClick={() => void markOne(notification)}>
                {content}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

export function NotificationsList() {
  return <RequireAuth>{() => <Inbox />}</RequireAuth>;
}
