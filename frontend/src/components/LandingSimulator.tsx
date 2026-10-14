"use client";

import { Anton } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

/** Deporte de las vistas públicas (también lo usan LigasPublicas y SimuladorLigas). */
export type Sport = "futbol" | "basquet" | "voley";

/* ------------------------------------------------------------------ */
/* Portada                                                             */
/* ------------------------------------------------------------------ */

// Tipografía condensada de afiche deportivo (se descarga sola con next/font)
export const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });

export const WINE = "#4a1222";
const SEASON_YEAR = new Date().getFullYear();

export default function LandingSimulator() {
  return (
    // Ocupa todo el ancho de la ventana aunque esté dentro de un contenedor con max-width
    <div
      className={`${anton.variable} relative isolate left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[#2a0811]`}
    >
      <HeroBackground />

      <section className="relative mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl flex-col items-center px-5 pt-12 text-center sm:px-6 sm:pt-16">
        {/* En móvil el texto se centra en el espacio libre; en pantallas grandes va arriba */}
        <div className="my-auto flex flex-col items-center py-6 sm:my-0 sm:py-0">
        <h1
          className={`${anton.className} text-[2.6rem] uppercase leading-[0.95] text-white min-[400px]:text-5xl sm:text-7xl lg:text-[5.75rem]`}
        >
          El juego es tuyo.
          <br />
          El orden, nuestro.
        </h1>

        {/* Cinta blanca inclinada, como la de los afiches */}
        <div className="mt-6 -skew-x-12 bg-white px-5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:px-10">
          <p className={`${anton.className} skew-x-12 whitespace-nowrap text-[15px] uppercase tracking-wide text-[#4a1222] min-[400px]:text-base sm:text-2xl`}>
            Calendarios, marcadores y tablas en vivo
          </p>
        </div>

        {/* Acceso y registro junto a "Explorar ligas"; en móvil se apilan con el mismo ancho */}
        <div className="mt-8 flex w-full max-w-[17rem] flex-col gap-3 text-center sm:w-auto sm:max-w-none sm:flex-row">
          <Link
            href="/login"
            className="rounded-md border-2 border-white bg-white px-8 py-3 text-sm font-bold tracking-wider text-[#4a1222] transition-colors hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1222]"
          >
            INICIAR SESIÓN
          </Link>
          <Link
            href="/registro"
            className="rounded-md border-2 border-white px-8 py-3 text-sm font-bold tracking-wider text-white transition-colors hover:bg-white hover:text-[#4a1222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1222]"
          >
            CREAR CUENTA
          </Link>
          <Link
            href="/ligas"
            className="rounded-md border-2 border-white px-8 py-3 text-sm font-bold tracking-wider text-white transition-colors hover:bg-white hover:text-[#4a1222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1222]"
          >
            EXPLORAR LIGAS
          </Link>
        </div>

        </div>

        {/* Emblemas y balones: van al final de la portada y se cortan en el borde inferior */}
        <div className="flex w-full justify-center pt-4 sm:mt-auto sm:pt-8">
          <PosterArt />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fondo: degradado vino con haces de luz diagonales                   */
/* ------------------------------------------------------------------ */

export function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(ellipse 85% 55% at 50% 0%, #7d2943 0%, #4a1222 48%, #2a0811 100%)",
      }}
    >
      <div className="absolute -left-[20%] top-0 h-full w-[45%] -skew-x-[22deg] bg-white/[0.035]" />
      <div className="absolute left-[12%] top-0 h-full w-[8%] -skew-x-[22deg] bg-white/[0.025]" />
      <div className="absolute -right-[15%] top-0 h-full w-[35%] skew-x-[22deg] bg-white/[0.03]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(ellipse_55%_75%_at_50%_100%,rgba(220,90,125,0.30),transparent)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Arte del afiche: emblemas con laurel + balones asomando desde abajo */
/* (cada balón se dibuja en un círculo de radio 100 centrado en 0,0)   */
/* ------------------------------------------------------------------ */

const deg = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, a: number, cx = 0, cy = 0) => [cx + r * Math.cos(deg(a)), cy + r * Math.sin(deg(a))];
const poly = (pts: number[][]) => pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
const DISPLAY_FONT = "var(--font-anton), Impact, 'Arial Narrow', sans-serif";

export function Basketball({ mono = false }: { mono?: boolean }) {
  return (
    <g>
      <circle r={100} fill={mono ? "#ffffff" : "url(#bk-fill)"} />
      {!mono && <circle r={100} fill="url(#bk-grain)" />}
      <g
        clipPath="url(#clip-ball)"
        fill="none"
        stroke={mono ? WINE : "#22100a"}
        strokeWidth={mono ? 8 : 4.5}
        strokeLinecap="round"
      >
        <path d="M0 -100 V100" />
        <path d="M-100 0 Q0 14 100 0" />
        <path d="M-62 -79 C-24 -40 -24 40 -62 79" />
        <path d="M62 -79 C24 -40 24 40 62 79" />
      </g>
    </g>
  );
}

export function SoccerBall({ mono = false }: { mono?: boolean }) {
  const ink = mono ? WINE : "#17171c";
  const angles = [0, 1, 2, 3, 4].map((k) => -90 + 72 * k);
  const center = angles.map((a) => pt(34, a));
  const outer = angles.map((a) => {
    const [cx, cy] = pt(90, a);
    return [0, 1, 2, 3, 4].map((j) => pt(30, a + 180 + 72 * j, cx, cy));
  });
  const seams: number[][][] = [];
  angles.forEach((_, k) => {
    seams.push([center[k], outer[k][0]]);
    seams.push([outer[k][1], outer[(k + 1) % 5][4]]);
  });

  return (
    <g>
      <circle r={100} fill={mono ? "#ffffff" : "#f6f4f1"} />
      <g clipPath="url(#clip-ball)">
        {seams.map(([p1, p2], i) => (
          <line
            key={i}
            x1={p1[0]}
            y1={p1[1]}
            x2={p2[0]}
            y2={p2[1]}
            stroke={mono ? ink : "#a7a6ad"}
            strokeWidth={mono ? 6 : 2.5}
          />
        ))}
        <polygon points={poly(center)} fill={ink} />
        {outer.map((pts, k) => (
          <polygon key={k} points={poly(pts)} fill={ink} />
        ))}
      </g>
    </g>
  );
}

export function Volleyball({ mono = false }: { mono?: boolean }) {
  // 3 paneles curvos; cada uno con 3 franjas paralelas (azul, blanco, amarillo)
  const panel = "M0 0 C30 -30 25 -70 0 -100 A100 100 0 0 1 86.6 50 C48.1 56.7 11 41 0 0 Z";
  const B = "#2350a8";
  const W = "#f6f4f1";
  const Y = "#f0bd2c";
  const palettes = mono
    ? [["#ffffff", "#ffffff", "#ffffff"], ["#ffffff", "#ffffff", "#ffffff"], ["#ffffff", "#ffffff", "#ffffff"]]
    : [[Y, W, B], [B, Y, W], [W, B, Y]];
  const ink = mono ? WINE : "#6b675f";
  const sw = mono ? 6 : 2.5;
  const id = mono ? "vb-m" : "vb-c";
  // centro externo de las franjas: a 175 unidades en la dirección media del panel (-30°)
  const cx = 151.6;
  const cy = -87.5;

  return (
    <g>
      <circle r={100} fill="#ffffff" />
      {palettes.map((pal, k) => (
        <g key={k} transform={`rotate(${k * 120})`}>
          <clipPath id={`${id}-${k}`}>
            <path d={panel} />
          </clipPath>
          <g clipPath={`url(#${id}-${k})`}>
            <circle cx={cx} cy={cy} r={180} fill={pal[0]} />
            <circle cx={cx} cy={cy} r={140} fill={pal[1]} stroke={ink} strokeWidth={sw} />
            <circle cx={cx} cy={cy} r={106} fill={pal[2]} stroke={ink} strokeWidth={sw} />
          </g>
          <path d={panel} fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        </g>
      ))}
      <circle r={100} fill="none" stroke={ink} strokeWidth={mono ? 0 : 1.5} />
    </g>
  );
}

/* Hoja de laurel en punta */
const LEAF = "M0 -14 C6.5 -6 6.5 6 0 14 C-6.5 6 -6.5 -6 0 -14 Z";

/* Rama de laurel del lado izquierdo (el derecho se refleja) */
function LaurelBranch() {
  const R = 64;
  const steps = 9;
  return (
    <g fill="#ffffff">
      <path
        d={`M${pt(R, 98).join(" ")} A${R} ${R} 0 0 1 ${pt(R, 248).join(" ")}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.2}
      />
      {Array.from({ length: steps }, (_, i) => {
        const a = 104 + (i / (steps - 1)) * 140;
        const scale = 1 - i * 0.045; // hojas más pequeñas hacia la punta
        const [ox, oy] = pt(R + 7, a);
        const [ix, iy] = pt(R - 7, a);
        return (
          <g key={i}>
            <path d={LEAF} transform={`translate(${ox} ${oy}) rotate(${a + 35}) scale(${scale})`} />
            <path d={LEAF} transform={`translate(${ix} ${iy}) rotate(${a - 35}) scale(${scale})`} />
          </g>
        );
      })}
    </g>
  );
}

export function Emblem({ x, label, ball }: { x: number; label: string; ball: ReactNode }) {
  return (
    <g transform={`translate(${x} -100)`}>
      <text
        y={-92}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={26}
        letterSpacing={1.5}
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {label}
      </text>
      <LaurelBranch />
      <g transform="scale(-1 1)">
        <LaurelBranch />
      </g>
      <circle r={47} fill="#ffffff" />
      <g transform="scale(0.43)">{ball}</g>

      {/* Cinta con pliegues */}
      <polygon points="-108,52 -92,66 -108,80 -78,80 -78,52" fill="#d9c4ca" />
      <polygon points="108,52 92,66 108,80 78,80 78,52" fill="#d9c4ca" />
      <polygon points="-78,74 -78,80 -66,74" fill="#8e5a68" />
      <polygon points="78,74 78,80 66,74" fill="#8e5a68" />
      <rect x={-90} y={44} width={180} height={30} rx={1} fill="#ffffff" />
      <text
        y={66}
        textAnchor="middle"
        fill={WINE}
        fontSize={17}
        letterSpacing={1}
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {`TEMPORADA ${SEASON_YEAR}`}
      </text>
    </g>
  );
}

function PosterArt() {
  const balls = [
    { x: 330, y: 330, r: 150, el: <Basketball /> },
    { x: 870, y: 330, r: 150, el: <Volleyball /> },
    { x: 600, y: 290, r: 170, el: <SoccerBall /> }, // al frente
  ];
  return (
    <svg
      viewBox="0 -222 1200 612"
      aria-hidden
      className="block w-[150%] max-w-none shrink-0 sm:w-[110%] lg:w-full lg:max-w-[920px]"
      // los balones se desvanecen en el borde inferior en vez de cortarse en seco
      style={{
        maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
      }}
    >
      <defs>
        <clipPath id="clip-ball">
          <circle r={100} />
        </clipPath>
        <radialGradient id="bk-fill" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#f39a4e" />
          <stop offset="55%" stopColor="#d4691f" />
          <stop offset="100%" stopColor="#7c2e0b" />
        </radialGradient>
        <pattern id="bk-grain" width={5} height={5} patternUnits="userSpaceOnUse">
          <circle cx={2.5} cy={2.5} r={0.9} fill="#5a1f06" opacity={0.35} />
        </pattern>
        <radialGradient id="ball-shade" cx="34%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="30%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="70%" stopColor="#000000" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.6} />
        </radialGradient>
      </defs>

      <Emblem x={330} label="BÁSQUETBOL" ball={<Basketball mono />} />
      <Emblem x={600} label="FÚTBOL" ball={<SoccerBall mono />} />
      <Emblem x={870} label="VOLEIBOL" ball={<Volleyball mono />} />

      {/* Llave que une los tres emblemas */}
      <g fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={2.5} strokeLinecap="round">
        <path d="M330 -12 Q330 30 372 30 H452" />
        <path d="M748 30 H828 Q870 30 870 -12" />
        <path d="M600 -12 V8" />
      </g>
      <text
        x={600}
        y={42}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={32}
        letterSpacing={2}
        style={{ fontFamily: DISPLAY_FONT }}
      >
        VARONIL Y FEMENIL
      </text>

      {balls.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.r / 100})`}>
          <circle r={106} fill="#14030a" opacity={0.45} />
          {b.el}
          <circle r={100} fill="url(#ball-shade)" />
        </g>
      ))}
    </svg>
  );
}
