import type { Metadata } from 'next';
import { MatchControl } from '@/components/match/match-control';

export const metadata: Metadata = { title: 'Control del partido' };

export default async function MatchControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchControl id={id} />;
}
