import { CalendarDays, ChartLine, Radio, ShieldCheck } from 'lucide-react';
import { HomeHero } from '@/components/home/hero';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Calendario automático',
    text: 'Round-robin con localía equilibrada, disponibilidad de canchas y descanso mínimo entre partidos.',
  },
  { icon: ShieldCheck, title: 'Árbitros asignados', text: 'Según su disponibilidad, zona y categoría certificada, sin cruces de horario.' },
  { icon: Radio, title: 'Marcador en vivo', text: 'Goles, tarjetas y cambios en tiempo real para todos los espectadores conectados.' },
  { icon: ChartLine, title: 'Estadísticas al instante', text: 'Tabla de posiciones, goleadores y tarjetas recalculados al cerrar cada acta.' },
];

/**
 * Portada pública: solo presentación, sin datos del backend (los partidos y las ligas se ven
 * después de iniciar sesión o en /ligas). Así carga al instante aunque los servicios estén dormidos.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-12 sm:grid-cols-2 sm:px-6 sm:pt-16 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
