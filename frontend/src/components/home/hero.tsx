import { HeroActions } from './hero-actions';
import { DivisionConnector, SportBall, SportEmblem, type Sport } from './sport-art';

const SPORTS: { sport: Sport; label: string }[] = [
  { sport: 'basketball', label: 'Básquetbol' },
  { sport: 'football', label: 'Fútbol' },
  { sport: 'volleyball', label: 'Voleibol' },
];

/**
 * Portada: ocupa la primera pantalla bajo la barra de navegación. Fondo granate con haces de luz,
 * titular condensado, los tres deportes con su emblema y los balones asomando por abajo.
 */
export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh_-_57px)] flex-col overflow-hidden bg-[#3d0f1f] text-white">
      {/* Fondo: foco central, haces de luz diagonales y viñeta */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,#8d2c4b_0%,#5f1a31_45%,#3d0f1f_75%,#2a0915_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-y-0 left-[6%] -z-10 w-[24%] origin-top skew-x-[24deg] bg-linear-to-b from-white/[0.07] via-white/[0.03] to-transparent" />
      <div aria-hidden="true" className="absolute inset-y-0 right-[6%] -z-10 w-[24%] origin-top -skew-x-[24deg] bg-linear-to-b from-white/[0.07] via-white/[0.03] to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pt-[clamp(1.5rem,5vh,4.5rem)] pb-[clamp(0.5rem,2vh,1.5rem)] text-center sm:px-6">
        <h1 className="font-display text-[length:clamp(2.6rem,min(7vw,10.5vh),6rem)] uppercase leading-[0.95] tracking-[0.01em] drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
          El juego es tuyo.
          <br />
          El orden, nuestro.
        </h1>

        <p className="mt-[clamp(1rem,2.6vh,1.75rem)] -skew-x-12 bg-white px-[clamp(1rem,3vw,2.75rem)] py-[clamp(0.3rem,0.9vw,0.6rem)] shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
          <span className="block skew-x-12 font-display text-[clamp(0.95rem,2.1vw,1.75rem)] uppercase tracking-[0.02em] text-[#5a1428]">
            Calendarios, marcadores y tablas en vivo
          </span>
        </p>

        <HeroActions className="mt-[clamp(1.25rem,3.6vh,2.25rem)]" />

        <div className="mt-[clamp(1.5rem,8vh,5rem)] w-full max-w-[600px] sm:mt-[clamp(1.5rem,4.5vh,4.5rem)]">
          <ul className="grid grid-cols-3">
            {SPORTS.map(({ sport, label }) => (
              <li key={sport} className="flex flex-col items-center">
                <span className="font-display text-[clamp(0.8rem,1.9vw,1.4rem)] uppercase tracking-[0.04em]">{label}</span>
                <SportEmblem sport={sport} className="mt-2 w-[clamp(88px,min(21vw,14vh),156px)]" />
              </li>
            ))}
          </ul>
          <DivisionConnector className="mt-1 w-full" />
          <p className="sr-only">Ramas varonil y femenil</p>
        </div>
      </div>

      {/* Balones asomando por abajo; el degradado los funde con el resto de la página */}
      <div aria-hidden="true" className="relative mx-auto h-[calc(var(--ball)*0.58)] w-full max-w-[760px] [--ball:250px] sm:[--ball:clamp(170px,min(24vw,26vh),290px)]">
        <SportBall sport="basketball" className="absolute bottom-0 left-[calc(50%_-_var(--ball)*0.62)] w-[calc(var(--ball)*0.84)] -translate-x-1/2 translate-y-[48%]" />
        <SportBall sport="volleyball" className="absolute bottom-0 left-[calc(50%_+_var(--ball)*0.62)] w-[calc(var(--ball)*0.84)] -translate-x-1/2 translate-y-[48%]" />
        <SportBall sport="football" className="absolute bottom-0 left-1/2 z-10 w-[var(--ball)] -translate-x-1/2 translate-y-[42%]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-linear-to-b from-transparent to-bg" />
    </section>
  );
}
