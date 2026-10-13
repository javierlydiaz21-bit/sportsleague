import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Footer, Navbar } from '@/components/navbar';
import './globals.css';
import { Providers } from './providers';

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
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
