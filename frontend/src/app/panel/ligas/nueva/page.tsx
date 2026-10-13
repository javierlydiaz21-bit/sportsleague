import type { Metadata } from 'next';
import { NewLeague } from '@/components/panel/new-league';

export const metadata: Metadata = { title: 'Nueva liga' };

export default function NewLeaguePage() {
  return <NewLeague />;
}
