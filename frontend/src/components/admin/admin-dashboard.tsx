'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAuth } from '../require-auth';
import { PageHeader, Tabs } from '../ui';
import { EventsFeed } from './events-feed';
import { LeaguesReview } from './leagues-review';
import { AdminOverview } from './overview';
import { SystemHealthView } from './system-health';
import { TraceViewer } from './trace-viewer';
import { UsersTable } from './users-table';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'ligas', label: 'Ligas' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'sistema', label: 'Sistema' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'trazabilidad', label: 'Trazabilidad' },
];

function Dashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as string) : 'resumen';
  const goTo = (key: string) => router.replace(`/admin?tab=${key}`, { scroll: false });

  return (
    <div>
      <PageHeader title="Administración" description="Autoriza ligas, gestiona cuentas y verifica que todos los microservicios estén funcionando." />
      <Tabs tabs={TABS} active={tab} onChange={goTo} />
      <div className="pt-6">
        {tab === 'resumen' && <AdminOverview goTo={goTo} />}
        {tab === 'ligas' && <LeaguesReview />}
        {tab === 'usuarios' && <UsersTable />}
        {tab === 'sistema' && <SystemHealthView />}
        {tab === 'eventos' && <EventsFeed />}
        {tab === 'trazabilidad' && <TraceViewer />}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return <RequireAuth roles={['ADMIN']}>{() => <Dashboard />}</RequireAuth>;
}
