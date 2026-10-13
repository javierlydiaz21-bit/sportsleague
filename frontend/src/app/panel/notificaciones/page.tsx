import type { Metadata } from 'next';
import { NotificationsList } from '@/components/panel/notifications-list';

export const metadata: Metadata = { title: 'Notificaciones' };

export default function NotificationsPage() {
  return <NotificationsList />;
}
