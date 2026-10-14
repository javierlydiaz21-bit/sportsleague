/** Ilustraciones SVG de la portada: emblemas con laureles y balones. Todas son decorativas. */

import type { ReactNode } from 'react';

export type Sport = 'basketball' | 'football' | 'volleyball';

const MAROON = '#5a1428';
const RING = '#2a0a14';
const DISPLAY_FONT = 'var(--font-anton), Impact, sans-serif';

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))] as const;
const round = (n: number) => Math.round(n * 100) / 100;

/** Puntos de un polígono regular (pentágonos del balón de fútbol). */
function polygon(cx: number, cy: number, r: number, startDeg: number, sides = 5): string {
  return Array.from({ length: sides }, (_, i) => at(cx, cy, r, startDeg + (360 / sides) * i).map(round).join(',')).join(' ');
}

// ---------------------------------------------------------------- Emblemas

const WREATH = { cx: 60, cy: 50, r: 37 };

/** Hojas de una rama de laurel (lado izquierdo), de abajo hacia arriba alrededor del balón. */
const LAUREL_LEAVES = Array.from({ length: 9 }, (_, i) => 118 + i * 16).flatMap((deg, i) =>
  [-1, 1].map((side) => {
    const [x, y] = at(WREATH.cx, WREATH.cy, WREATH.r + side * 4.4, deg + side * 4);
    return { x: round(x), y: round(y), rotate: round(deg + side * 30), ry: round(7.4 - i * 0.28) };
  }),
);

function LaurelBranch() {
  const [x1, y1] = at(WREATH.cx, WREATH.cy, WREATH.r, 112).map(round);
  const [x2, y2] = at(WREATH.cx, WREATH.cy, WREATH.r, 252).map(round);
  const [tipX, tipY] = at(WREATH.cx, WREATH.cy, WREATH.r, 258).map(round);
  return (
    <g fill="#fff">
      <path d={`M${x1} ${y1} A${WREATH.r} ${WREATH.r} 0 0 1 ${x2} ${y2}`} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      {LAUREL_LEAVES.map((leaf, i) => (
        <ellipse key={i} cx={leaf.x} cy={leaf.y} rx={2.9} ry={leaf.ry} transform={`rotate(${leaf.rotate} ${leaf.x} ${leaf.y})`} />
      ))}
      <ellipse cx={tipX} cy={tipY} rx={2.6} ry={5.6} transform={`rotate(258 ${tipX} ${tipY})`} />
    </g>
  );
}

function BallIcon({ sport }: { sport: Sport }) {
  const stroke = { fill: 'none', stroke: MAROON, strokeWidth: 2.3, strokeLinecap: 'round' as const };
  if (sport === 'basketball') {
    return (
      <g>
        <circle cx={60} cy={50} r={22} fill="#fff" stroke={MAROON} strokeWidth={2.4} />
        <path d="M60 28V72M38 50H82M45.5 33.5C53 41 53 59 45.5 66.5M74.5 33.5C67 41 67 59 74.5 66.5" {...stroke} />
      </g>
    );
  }
  if (sport === 'football') {
    const clip = 'emblem-football-clip';
    return (
      <g>
        <defs>
          <clipPath id={clip}>
            <circle cx={60} cy={50} r={22} />
          </clipPath>
        </defs>
        <circle cx={60} cy={50} r={22} fill="#fff" />
        <g clipPath={`url(#${clip})`}>
          <polygon points={polygon(60, 50, 7.2, -90)} fill={MAROON} />
          {[0, 1, 2, 3, 4].map((k) => {
            const deg = -90 + 72 * k;
            const [x1, y1] = at(60, 50, 7.2, deg);
            const [x2, y2] = at(60, 50, 13.5, deg);
            const [px, py] = at(60, 50, 20.5, deg);
            return (
              <g key={k}>
                <line x1={round(x1)} y1={round(y1)} x2={round(x2)} y2={round(y2)} stroke={MAROON} strokeWidth={1.7} />
                <polygon points={polygon(px, py, 6.8, deg + 180)} fill={MAROON} />
              </g>
            );
          })}
        </g>
        <circle cx={60} cy={50} r={22} fill="none" stroke={MAROON} strokeWidth={2.4} />
      </g>
    );
  }
  // Trazos del icono «volleyball» de Lucide (ISC), escalados de r=10 a r=22.
  return (
    <g>
      <circle cx={60} cy={50} r={22} fill="#fff" stroke={MAROON} strokeWidth={2.4} />
      <g transform="translate(33.6 23.6) scale(2.2)" {...stroke} strokeWidth={1.05}>
        <path d="M11 7a16 16 20 0 1 10.98 4.362" />
        <path d="M12 12a13 13 0 0 1-8.66 5" />
        <path d="M16.83 13.634a16 16 0 0 1-9.267 7.328" />
        <path d="M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10" />
        <path d="M8.17 15.366a16 16 0 0 1-1.713-11.69" />
      </g>
    </g>
  );
}

function Ribbon() {
  return (
    <g>
      <polygon points="3,84 22,84 22,100 3,100 9,92" fill="#e5bfc8" />
      <polygon points="117,84 98,84 98,100 117,100 111,92" fill="#e5bfc8" />
      <polygon points="16,96 22,100 22,96" fill="#a8707f" />
      <polygon points="104,96 98,100 98,96" fill="#a8707f" />
      <rect x={16} y={80} width={88} height={16} rx={1} fill="#fff" />
      <text x={60} y={91.7} textAnchor="middle" fontSize={9.2} letterSpacing={0.35} fill={MAROON} style={{ fontFamily: DISPLAY_FONT }}>
        TEMPORADA 2026
      </text>
    </g>
  );
}

/** Emblema: laureles alrededor del balón y cinta «Temporada 2026». */
export function SportEmblem({ sport, className }: { sport: Sport; className?: string }) {
  return (
    <svg viewBox="0 0 120 104" className={className} aria-hidden="true" focusable="false">
      <LaurelBranch />
      <g transform="matrix(-1 0 0 1 120 0)">
        <LaurelBranch />
      </g>
      <BallIcon sport={sport} />
      <Ribbon />
    </svg>
  );
}

/** Líneas que unen los tres emblemas con «Varonil y femenil» (mismo ancho que la fila de emblemas). */
export function DivisionConnector({ className }: { className?: string }) {
  const line = { fill: 'none', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 2, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 600 62" className={className} aria-hidden="true" focusable="false">
      <path d="M100 2V28Q100 44 116 44H188" {...line} />
      <path d="M500 2V28Q500 44 484 44H412" {...line} />
      <path d="M300 2V20" {...line} />
      <text x={300} y={54} textAnchor="middle" fontSize={27} letterSpacing={1} fill="#fff" style={{ fontFamily: DISPLAY_FONT }}>
        VARONIL Y FEMENIL
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- Balones grandes

function BallFrame({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx={110} cy={110} r={100} />
        </clipPath>
        <radialGradient id={`${id}-shade`} cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.4} />
          <stop offset="40%" stopColor="#fff" stopOpacity={0} />
          <stop offset="78%" stopColor="#000" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.42} />
        </radialGradient>
      </defs>
      <circle cx={110} cy={110} r={109} fill={RING} />
      <g clipPath={`url(#${id}-clip)`}>
        {children}
        <circle cx={110} cy={110} r={100} fill={`url(#${id}-shade)`} />
      </g>
    </>
  );
}

function Basketball() {
  return (
    <BallFrame id="bb">
      <defs>
        <radialGradient id="bb-fill" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffb878" />
          <stop offset="45%" stopColor="#f08a3c" />
          <stop offset="85%" stopColor="#c45b1a" />
          <stop offset="100%" stopColor="#8f3f10" />
        </radialGradient>
        <pattern id="bb-dots" width={6} height={6} patternUnits="userSpaceOnUse">
          <circle cx={3} cy={3} r={0.9} fill="#000" fillOpacity={0.13} />
        </pattern>
      </defs>
      <circle cx={110} cy={110} r={100} fill="url(#bb-fill)" />
      <circle cx={110} cy={110} r={100} fill="url(#bb-dots)" />
      <path
        d="M110 8V212M8 110H212M44 24C86 70 86 150 44 196M176 24C134 70 134 150 176 196"
        fill="none"
        stroke="#231a17"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </BallFrame>
  );
}

function Football() {
  const seams: string[] = [];
  const outer: string[] = [];
  for (let k = 0; k < 5; k++) {
    const deg = -90 + 72 * k;
    const [cx1, cy1] = at(110, 110, 30, deg);
    const [jx, jy] = at(110, 110, 58, deg);
    seams.push(`M${round(cx1)} ${round(cy1)}L${round(jx)} ${round(jy)}`);
    for (const side of [-1, 1]) {
      const [hx, hy] = at(110, 110, 76, deg + side * 27);
      const [ex, ey] = at(110, 110, 112, deg + side * 36);
      seams.push(`M${round(jx)} ${round(jy)}L${round(hx)} ${round(hy)}L${round(ex)} ${round(ey)}`);
    }
    const [px, py] = at(110, 110, 100, deg);
    outer.push(polygon(px, py, 30, deg + 180));
  }
  return (
    <BallFrame id="fb">
      <defs>
        <radialGradient id="fb-fill" cx="40%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#eeeef2" />
          <stop offset="88%" stopColor="#c6c7d0" />
          <stop offset="100%" stopColor="#9c9eaa" />
        </radialGradient>
      </defs>
      <circle cx={110} cy={110} r={100} fill="url(#fb-fill)" />
      <path d={seams.join('')} fill="none" stroke="#9496a3" strokeWidth={2.4} strokeLinejoin="round" />
      <polygon points={polygon(110, 110, 30, -90)} fill="#1c1c22" />
      {outer.map((points, i) => (
        <polygon key={i} points={points} fill="#1c1c22" />
      ))}
    </BallFrame>
  );
}

function Volleyball() {
  return (
    <BallFrame id="vb">
      <defs>
        <radialGradient id="vb-fill" cx="40%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f2f6" />
          <stop offset="100%" stopColor="#b8bccb" />
        </radialGradient>
      </defs>
      <circle cx={110} cy={110} r={100} fill="url(#vb-fill)" />
      <path d="M22 62C70 22 146 18 200 60L190 84C140 46 78 50 34 88Z" fill="#f2c335" />
      <path d="M8 104C24 150 62 190 112 214L84 216C44 192 14 150 4 128Z" fill="#2f5fae" />
      <path d="M150 112C178 140 192 176 186 214L212 190C214 160 200 124 172 98Z" fill="#2f5fae" />
      <path
        d="M22 62C70 22 146 18 200 60M34 88C78 50 140 46 190 84M8 104C24 150 62 190 112 214M4 128C14 150 44 192 84 216M150 112C178 140 192 176 186 214M172 98C200 124 214 160 212 190M110 110C126 120 140 112 150 112M110 110C98 92 70 92 34 88M110 110C104 140 82 160 60 178"
        fill="none"
        stroke="#283252"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </BallFrame>
  );
}

/** Balón grande a color para el pie de la portada. */
export function SportBall({ sport, className }: { sport: Sport; className?: string }) {
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true" focusable="false">
      {sport === 'basketball' ? <Basketball /> : sport === 'football' ? <Football /> : <Volleyball />}
    </svg>
  );
}
