"use client";

import Link from "next/link";
import { useMemo, useState, type JSX } from "react";
import {
  anton,
  Basketball,
  Emblem,
  HeroBackground,
  SoccerBall,
  Volleyball,
  WINE,
  type Sport,
} from "./LandingSimulator";

/* ------------------------------------------------------------------ */
/* Datos: llegan de tu API. Mientras no haya ligas, se pasa un arreglo */
/* vacío y la página muestra el espacio reservado.                     */
/* ------------------------------------------------------------------ */

export type PublicLeague = {
  id: string;
  name: string;
  sport: Sport;
  href: string; // ruta de la liga, p. ej. `/ligas/${id}`
  city?: string;
  teams?: number;
  currentRound?: number;
  totalRounds?: number;
};

const EMBLEM: Record<Sport, { label: string; ball: JSX.Element }> = {
  futbol: { label: "FÚTBOL", ball: <SoccerBall mono /> },
  basquet: { label: "BÁSQUETBOL", ball: <Basketball mono /> },
  voley: { label: "VOLEIBOL", ball: <Volleyball mono /> },
};

const SPORT_ORDER: Sport[] = ["basquet", "futbol", "voley"];

const FILTERS: { value: Sport | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "futbol", label: "Fútbol" },
  { value: "basquet", label: "Básquet" },
  { value: "voley", label: "Vóley" },
];

const normalize = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Emblema suelto (laurel + balón + cinta) dentro de su propio SVG */
function EmblemSvg({ sport, className = "" }: { sport: Sport; className?: string }) {
  const e = EMBLEM[sport];
  return (
    <svg viewBox="-125 -228 250 220" aria-hidden className={`${anton.variable} block ${className}`}>
      <defs>
        <clipPath id="clip-ball">
          <circle r={100} />
        </clipPath>
      </defs>
      <Emblem x={0} label={e.label} ball={e.ball} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function LigasPublicas({ leagues = [] }: { leagues?: PublicLeague[] }) {
  const [filter, setFilter] = useState<Sport | "todas">("todas");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return leagues.filter(
      (l) =>
        (filter === "todas" || l.sport === filter) &&
        (!q || normalize(`${l.name} ${l.city ?? ""}`).includes(q))
    );
  }, [leagues, filter, query]);

  const filtering = filter !== "todas" || query.trim() !== "";

  return (
    // Ocupa todo el ancho de la ventana aunque esté dentro de un contenedor con max-width
    <div
      className={`${anton.variable} relative isolate left-1/2 right-1/2 -mx-[50vw] min-h-[calc(100svh-3rem)] w-screen overflow-hidden bg-[#2a0811]`}
    >
      <HeroBackground />

      {/* Encabezado */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-6 sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1222]"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Volver a la portada
        </Link>
        <h1 className={`${anton.className} mt-5 text-6xl uppercase leading-none text-white sm:text-8xl`}>Ligas</h1>
        <div className="mt-4 inline-block -skew-x-12 bg-white px-5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:px-8">
          <p className={`${anton.className} skew-x-12 text-base uppercase tracking-wide text-[#4a1222] sm:text-xl`}>
            Posiciones, calendario y resultados
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por deporte">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1222] ${
                    active
                      ? "bg-white text-[#4a1222]"
                      : "border border-white/35 text-white hover:border-white hover:bg-white/10"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Buscar por nombre o ciudad</span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx={11} cy={11} r={7} />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o ciudad"
              className="w-full rounded-md border-0 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#4a1222]"
            />
          </label>
        </div>
      </section>

      {/* Ligas */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        {visible.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((l) => (
              <li key={l.id}>
                <LeagueCard league={l} />
              </li>
            ))}
          </ul>
        ) : leagues.length === 0 ? (
          <EmptyLeagues />
        ) : (
          <div className="rounded-xl border border-dashed border-white/30 px-6 py-14 text-center">
            <p className="font-semibold text-white">No encontramos ligas</p>
            <p className="mt-1 text-sm text-white/70">Prueba con otra búsqueda o con otro deporte.</p>
            {filtering && (
              <button
                onClick={() => {
                  setFilter("todas");
                  setQuery("");
                }}
                className="mt-5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#4a1222] hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1222]"
              >
                Quitar filtros
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Espacio reservado mientras no hay ligas                             */
/* ------------------------------------------------------------------ */

function EmptyLeagues() {
  return (
    <div className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-6 pb-12 pt-10 text-center">
      <div className="mx-auto flex max-w-2xl items-end justify-center gap-2 opacity-35 sm:gap-6">
        {SPORT_ORDER.map((s) => (
          <EmblemSvg key={s} sport={s} className="h-24 w-auto sm:h-36" />
        ))}
      </div>
      <p className={`${anton.className} mt-8 text-2xl uppercase tracking-wide text-white sm:text-3xl`}>
        Aún no hay ligas publicadas
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
        Cuando se creen y aprueben ligas de fútbol, básquet o vóley, aparecerán aquí con sus posiciones,
        calendario y resultados.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de liga (para datos reales)                                 */
/* ------------------------------------------------------------------ */

function LeagueCard({ league }: { league: PublicLeague }) {
  const hasRound = league.currentRound != null && league.totalRounds != null;

  return (
    <Link
      href={league.href}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl bg-white text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a0811] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        className="px-6 pb-3 pt-5"
        style={{ background: "radial-gradient(ellipse 90% 90% at 50% 0%, #7d2943 0%, #4a1222 55%, #33091a 100%)" }}
      >
        <EmblemSvg sport={league.sport} className="mx-auto h-44 w-auto" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold leading-snug text-neutral-950">{league.name}</h2>
        {league.city && <p className="text-sm text-neutral-500">{league.city}</p>}

        {(league.teams != null || hasRound) && (
          <div className="mt-3 flex gap-4 text-sm text-neutral-600">
            {league.teams != null && <span>{league.teams} equipos</span>}
            {hasRound && (
              <span>
                Jornada {league.currentRound} de {league.totalRounds}
              </span>
            )}
          </div>
        )}

        <span className="mt-auto pt-5 text-sm font-semibold" style={{ color: WINE }}>
          Ver liga
        </span>
      </div>
    </Link>
  );
}
