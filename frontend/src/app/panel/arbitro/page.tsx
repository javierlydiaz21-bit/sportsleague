import type { Metadata } from 'next';
import { RefereeHome } from '@/components/panel/referee-home';

export const metadata: Metadata = { title: 'Mis partidos' };

export default function RefereePage() {
  return <RefereeHome />;
}
