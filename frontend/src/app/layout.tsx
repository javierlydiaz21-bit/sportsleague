import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { Anton } from 'next/font/google';
import type { ReactNode } from 'react';
import { Footer, Navbar } from '@/components/navbar';
import { PageContainer } from '@/components/page-container';
import './globals.css';
import { Providers } from './providers';

/** Tipografía condensada para los titulares de la portada. */
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'SportsLeague — Ligas deportivas amateur', template: '%s · SportsLeague' },
  description:
    'Crea tu liga, genera el calendario automáticamente, registra resultados en vivo y consulta tablas de posiciones de fútbol, básquet y vóley.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} ${anton.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          <Navbar />
          <PageContainer>{children}</PageContainer>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
