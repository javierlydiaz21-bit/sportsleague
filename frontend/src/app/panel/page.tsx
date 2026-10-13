import type { Metadata } from 'next';
import { PanelHome } from '@/components/panel/panel-home';

export const metadata: Metadata = { title: 'Mis ligas' };

export default function PanelPage() {
  return <PanelHome />;
}
