"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Sport } from "./LandingSimulator";

/*
 * Simulador de ligas ficticias (fútbol, básquet y vóley). Antes se abría con «Explorar ligas» en la
 * portada; ahora ese botón lleva a /ligas. Se conserva aquí para poder volver a usarlo:
 *   import SimuladorLigas from "@/components/SimuladorLigas";
 */

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Team = { id: string; name: string; color: string; strength: number };

type Fixture = { home: string; away: string };

type Match = Fixture & {
  homeScore: number; // goles / puntos / sets ganados
  awayScore: number;
  homeSetPts: number; // puntos del set en curso (solo vóley)
  awaySetPts: number;
  clock: number; // minuto (fútbol/básquet) o rally (vóley)
  done: boolean;
};

type Row = {
  id: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  f: number;
  c: number;
  pts: number;
  live: boolean;
};

type SportConfig = {
  label: string;
  tickMs: number;
  showDraws: boolean;
  teams: Team[];
  step: (m: Match, home: Team, away: Team) => Match;
  points: (own: number, rival: number) => number;
  clockLabel: (m: Match) => string;
  progress: (m: Match) => number; // 0..1
};

/* ------------------------------------------------------------------ */
/* Configuración por deporte                                           */
/* ------------------------------------------------------------------ */

const rand = Math.random;

const SPORTS: Record<Sport, SportConfig> = {
  futbol: {
    label: "Fútbol",
    tickMs: 140,
    showDraws: true,
    teams: [
      { id: "dno", name: "Deportivo Norte", color: "#16a34a", strength: 1.15 },
      { id: "atr", name: "Atlético Ribera", color: "#dc2626", strength: 1.05 },
      { id: "rsa", name: "Real Sabana", color: "#2563eb", strength: 1.0 },
      { id: "uce", name: "Unión Centro", color: "#ca8a04", strength: 0.95 },
      { id: "jfc", name: "Juventud FC", color: "#7c3aed", strength: 0.9 },
      { id: "lro", name: "Los Robles", color: "#0f766e", strength: 0.85 },
    ],
    step: (m, h, a) => {
      const clock = m.clock + 1;
      return {
        ...m,
        clock,
        homeScore: m.homeScore + (rand() < 0.016 * h.strength ? 1 : 0),
        awayScore: m.awayScore + (rand() < 0.014 * a.strength ? 1 : 0),
        done: clock >= 90,
      };
    },
    points: (own, rival) => (own > rival ? 3 : own === rival ? 1 : 0),
    clockLabel: (m) => (m.done ? "Final" : `${m.clock}'`),
    progress: (m) => Math.min(m.clock / 90, 1),
  },

  basquet: {
    label: "Básquet",
    tickMs: 260,
    showDraws: false,
    teams: [
      { id: "hal", name: "Halcones", color: "#ea580c", strength: 1.12 },
      { id: "tit", name: "Titanes", color: "#1d4ed8", strength: 1.06 },
      { id: "lob", name: "Lobos", color: "#475569", strength: 1.0 },
      { id: "con", name: "Cóndores", color: "#b91c1c", strength: 0.96 },
      { id: "tor", name: "Toros", color: "#a16207", strength: 0.92 },
      { id: "pir", name: "Piratas", color: "#111827", strength: 0.88 },
    ],
    step: (m, h, a) => {
      const clock = m.clock + 1;
      const homeScore = m.homeScore + Math.round(rand() * 4.4 * h.strength);
      const awayScore = m.awayScore + Math.round(rand() * 4.2 * a.strength);
      // Si hay empate al minuto 40, se sigue jugando (prórroga)
      return { ...m, clock, homeScore, awayScore, done: clock >= 40 && homeScore !== awayScore };
    },
    points: (own, rival) => (own > rival ? 2 : 1), // sistema FIBA
    clockLabel: (m) =>
      m.done ? "Final" : m.clock >= 40 ? "Prórroga" : `${Math.floor(m.clock / 10) + 1}º cuarto`,
    progress: (m) => Math.min(m.clock / 40, 1),
  },

  voley: {
    label: "Vóley",
    tickMs: 55,
    showDraws: false,
    teams: [
      { id: "ola", name: "Olas", color: "#0284c7", strength: 1.12 },
      { id: "vol", name: "Volcán", color: "#dc2626", strength: 1.06 },
      { id: "ray", name: "Rayo", color: "#ca8a04", strength: 1.0 },
      { id: "cum", name: "Cumbre", color: "#4d7c0f", strength: 0.96 },
      { id: "mar", name: "Marea", color: "#0e7490", strength: 0.92 },
      { id: "bri", name: "Brisa", color: "#9333ea", strength: 0.88 },
    ],
    step: (m, h, a) => {
      let { homeScore, awayScore, homeSetPts, awaySetPts } = m;
      if (rand() < h.strength / (h.strength + a.strength)) homeSetPts++;
      else awaySetPts++;

      const target = homeScore + awayScore === 4 ? 15 : 25; // el 5º set va a 15
      const setOver =
        (homeSetPts >= target || awaySetPts >= target) && Math.abs(homeSetPts - awaySetPts) >= 2;

      if (setOver) {
        if (homeSetPts > awaySetPts) homeScore++;
        else awayScore++;
        homeSetPts = 0;
        awaySetPts = 0;
      }
      return {
        ...m,
        homeScore,
        awayScore,
        homeSetPts,
        awaySetPts,
        clock: m.clock + 1,
        done: homeScore === 3 || awayScore === 3,
      };
    },
    // 3-0 o 3-1: 3 pts al ganador. 3-2: 2 al ganador y 1 al perdedor.
    points: (own, rival) => (own > rival ? (rival === 2 ? 2 : 3) : own === 2 ? 1 : 0),
    clockLabel: (m) => (m.done ? "Final" : `Set ${m.homeScore + m.awayScore + 1}`),
    progress: (m) => (m.done ? 1 : (m.homeScore + m.awayScore) / 5),
  },
};

const SPORT_KEYS = Object.keys(SPORTS) as Sport[];

/* ------------------------------------------------------------------ */
/* Lógica                                                              */
/* ------------------------------------------------------------------ */

// Todos contra todos (método del círculo): 6 equipos -> 5 jornadas de 3 partidos
function roundRobin(ids: string[]): Fixture[][] {
  const t = [...ids];
  const rounds: Fixture[][] = [];
  for (let r = 0; r < t.length - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < t.length / 2; i++) {
      const a = t[i];
      const b = t[t.length - 1 - i];
      round.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(round);
    t.splice(1, 0, t.pop()!);
  }
  return rounds;
}

const newMatch = (f: Fixture): Match => ({
  ...f,
  homeScore: 0,
  awayScore: 0,
  homeSetPts: 0,
  awaySetPts: 0,
  clock: 0,
  done: false,
});

function buildTable(cfg: SportConfig, results: Match[], live: Match[]): Row[] {
  const rows = new Map<string, Row>(
    cfg.teams.map((t) => [t.id, { id: t.id, pj: 0, g: 0, e: 0, p: 0, f: 0, c: 0, pts: 0, live: false }])
  );

  const add = (m: Match, isLive: boolean) => {
    const sides: [string, number, number][] = [
      [m.home, m.homeScore, m.awayScore],
      [m.away, m.awayScore, m.homeScore],
    ];
    for (const [id, own, rival] of sides) {
      const r = rows.get(id)!;
      r.pj++;
      r.f += own;
      r.c += rival;
      if (own > rival) r.g++;
      else if (own === rival) r.e++;
      else r.p++;
      r.pts += cfg.points(own, rival);
      if (isLive) r.live = true;
    }
  };

  results.forEach((m) => add(m, false));
  live.filter((m) => m.clock > 0).forEach((m) => add(m, !m.done));

  return [...rows.values()].sort(
    (a, b) => b.pts - a.pts || b.f - b.c - (a.f - a.c) || b.f - a.f || a.id.localeCompare(b.id)
  );
}

/** Simulador con su selector de deporte y «Jugar otra temporada». */
export default function SimuladorLigas() {
  const [sport, setSport] = useState<Sport>("futbol");
  const [season, setSeason] = useState(0);
  return (
    <Simulator
      key={`${sport}-${season}`}
      sport={sport}
      onSportChange={setSport}
      onRestart={() => setSeason((s) => s + 1)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Simulador                                                           */
/* ------------------------------------------------------------------ */

function Simulator({
  sport,
  onSportChange,
  onRestart,
}: {
  sport: Sport;
  onSportChange: (s: Sport) => void;
  onRestart: () => void;
}) {
  const cfg = SPORTS[sport];
  const teamsById = useMemo(() => Object.fromEntries(cfg.teams.map((t) => [t.id, t])), [cfg]);
  const rounds = useMemo(() => roundRobin(cfg.teams.map((t) => t.id)), [cfg]);

  const [round, setRound] = useState(0);
  const [live, setLive] = useState<Match[]>(() => rounds[0].map(newMatch));
  const [results, setResults] = useState<Match[]>([]);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const seasonOver = live.length === 0;
  const roundDone = !seasonOver && live.every((m) => m.done);
  const running = !paused && visible;

  // Respeta "reducir movimiento" y pausa cuando el panel no está en pantalla
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Avanza los partidos en juego
  useEffect(() => {
    if (!running || roundDone || seasonOver) return;
    const id = setInterval(() => {
      setLive((prev) =>
        prev.map((m) => (m.done ? m : cfg.step(m, teamsById[m.home], teamsById[m.away])))
      );
    }, cfg.tickMs);
    return () => clearInterval(id);
  }, [running, roundDone, seasonOver, cfg, teamsById]);

  // Al terminar la jornada, espera un momento y pasa a la siguiente
  useEffect(() => {
    if (!running || !roundDone) return;
    const t = setTimeout(() => {
      setResults((r) => [...r, ...live]);
      const next = round + 1;
      setRound(next);
      setLive(next < rounds.length ? rounds[next].map(newMatch) : []);
    }, 2400);
    return () => clearTimeout(t);
  }, [running, roundDone, live, round, rounds]);

  const table = useMemo(() => buildTable(cfg, results, live), [cfg, results, live]);
  const champion = teamsById[table[0].id];

  return (
    <div ref={ref} className="rounded-2xl border border-neutral-200 bg-white">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5">
        <div role="tablist" aria-label="Deporte" className="inline-flex rounded-lg bg-neutral-100 p-1">
          {SPORT_KEYS.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={s === sport}
              onClick={() => onSportChange(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
                s === sport ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {SPORTS[s].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">
            {seasonOver ? "Temporada terminada" : `Jornada ${round + 1} de ${rounds.length}`}
          </span>
          {!seasonOver && (
            <button
              onClick={() => setPaused((p) => !p)}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              {paused ? "Jugar" : "Pausar"}
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Partidos */}
        <div className="border-b border-neutral-200 p-4 sm:p-5 md:border-b-0 md:border-r">
          <div className="mb-3 flex h-5 items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              {seasonOver ? "Resultado final" : "Partidos de la jornada"}
            </h2>
            {!seasonOver &&
              (roundDone ? (
                <span className="text-xs text-neutral-500">Jornada finalizada</span>
              ) : running ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                    <span className="relative h-2 w-2 rounded-full bg-green-600" />
                  </span>
                  En vivo
                </span>
              ) : (
                <span className="text-xs text-neutral-500">En pausa</span>
              ))}
          </div>

          {seasonOver ? (
            <div className="flex flex-col items-start gap-2 rounded-lg bg-neutral-50 p-5">
              <p className="text-sm text-neutral-500">Campeón de la temporada</p>
              <p className="flex items-center gap-2.5 text-2xl font-semibold text-neutral-950">
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: champion.color }} />
                {champion.name}
              </p>
              <p className="text-sm text-neutral-500">
                {table[0].pts} puntos en {table[0].pj} partidos.
              </p>
              <button
                onClick={onRestart}
                className="mt-3 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                Jugar otra temporada
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {live.map((m) => (
                <MatchCard
                  key={`${m.home}-${m.away}`}
                  match={m}
                  cfg={cfg}
                  sport={sport}
                  home={teamsById[m.home]}
                  away={teamsById[m.away]}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Tabla */}
        <div className="p-4 sm:p-5">
          <h2 className="mb-3 h-5 text-sm font-semibold text-neutral-900">Tabla de posiciones</h2>
          <Standings cfg={cfg} table={table} sport={sport} />
        </div>
      </div>

      <p className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500 sm:px-5">
        Liga de demostración con equipos ficticios. Los resultados se generan al azar.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Partido                                                             */
/* ------------------------------------------------------------------ */

function MatchCard({
  match: m,
  cfg,
  sport,
  home,
  away,
}: {
  match: Match;
  cfg: SportConfig;
  sport: Sport;
  home: Team;
  away: Team;
}) {
  return (
    <li className="rounded-lg border border-neutral-200 px-3 pb-2 pt-2.5">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={m.done ? "text-neutral-500" : "font-medium text-green-700"}>
          {cfg.clockLabel(m)}
        </span>
        {sport === "voley" && !m.done && (
          <span className="tabular-nums text-neutral-500">
            {m.homeSetPts}-{m.awaySetPts}
          </span>
        )}
      </div>
      <TeamLine team={home} score={m.homeScore} winner={m.done && m.homeScore > m.awayScore} />
      <TeamLine team={away} score={m.awayScore} winner={m.done && m.awayScore > m.homeScore} />
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full bg-green-600 transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${cfg.progress(m) * 100}%` }}
        />
      </div>
    </li>
  );
}

function TeamLine({ team, score, winner }: { team: Team; score: number; winner: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color }} />
        <span className={`truncate ${winner ? "font-semibold text-neutral-950" : "text-neutral-800"}`}>
          {team.name}
        </span>
      </span>
      <span className="font-semibold tabular-nums text-neutral-950">{score}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabla de posiciones (las filas se deslizan al cambiar de puesto)    */
/* ------------------------------------------------------------------ */

const ROW_H = 36;

function Standings({ cfg, table, sport }: { cfg: SportConfig; table: Row[]; sport: Sport }) {
  // Clases completas para que Tailwind las detecte
  const cols = cfg.showDraws
    ? "grid-cols-[1.25rem_minmax(0,1fr)_repeat(6,2rem)]"
    : "grid-cols-[1.25rem_minmax(0,1fr)_repeat(5,2rem)]";
  const diffLabel = sport === "futbol" ? "DG" : sport === "voley" ? "DS" : "DIF";
  const headers = ["PJ", "G", ...(cfg.showDraws ? ["E"] : []), "P", diffLabel, "PTS"];

  return (
    <div className="text-sm">
      <div className={`grid ${cols} items-center gap-1 border-b border-neutral-200 pb-2 text-xs text-neutral-500`}>
        <span>#</span>
        <span>Equipo</span>
        {headers.map((h) => (
          <span key={h} className="text-right">
            {h}
          </span>
        ))}
      </div>

      {/* Versión visual animada */}
      <div aria-hidden className="relative" style={{ height: ROW_H * cfg.teams.length }}>
        {cfg.teams.map((t) => {
          const pos = table.findIndex((r) => r.id === t.id);
          const r = table[pos];
          const diff = r.f - r.c;
          const values = [r.pj, r.g, ...(cfg.showDraws ? [r.e] : []), r.p, diff > 0 ? `+${diff}` : diff];
          return (
            <div
              key={t.id}
              className={`absolute inset-x-0 grid ${cols} items-center gap-1 border-b border-neutral-100 transition-transform duration-500 ease-out motion-reduce:transition-none`}
              style={{ height: ROW_H, transform: `translateY(${pos * ROW_H}px)` }}
            >
              <span className={pos === 0 ? "font-semibold text-green-700" : "text-neutral-400"}>{pos + 1}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
                <span className="truncate text-neutral-800">{t.name}</span>
                {r.live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />}
              </span>
              {values.map((v, i) => (
                <span key={i} className="text-right tabular-nums text-neutral-600">
                  {v}
                </span>
              ))}
              <span className="text-right font-semibold tabular-nums text-neutral-950">{r.pts}</span>
            </div>
          );
        })}
      </div>

      {/* Versión para lectores de pantalla */}
      <ol className="sr-only">
        {table.map((r) => (
          <li key={r.id}>
            {cfg.teams.find((t) => t.id === r.id)!.name}: {r.pts} puntos, {r.pj} partidos jugados
          </li>
        ))}
      </ol>
    </div>
  );
}
