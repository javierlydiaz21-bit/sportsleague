import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { PageSpinner } from '@/components/ui';

export const metadata: Metadata = { title: 'Administración' };

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminDashboard />
    </Suspense>
  );
}
