import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeagueManager } from '@/components/panel/league-manager';
import { PageSpinner } from '@/components/ui';

export const metadata: Metadata = { title: 'Gestionar liga' };

export default async function ManageLeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSpinner />}>
      <LeagueManager id={id} />
    </Suspense>
  );
}
