'use client';

import { useState, type PointerEvent } from 'react';
import { compact, niceMax, ticks, useWidth } from './use-width';

export interface TrendPoint {
  x: number;
  y: number;
  label?: string;
}

const RESULT: Record<string, string> = { G: 'Ganó', E: 'Empató', P: 'Perdió' };

/**
 * Serie única (puntos acumulados por partido): línea de 2px, área al 10 %,
 * punto final con anillo de superficie y valor directo; crosshair + tooltip al pasar.
 */
export function TrendChart({
  points,
  color = '#2a78d6',
  height = 220,
  unit = 'pts',
}: {
  points: TrendPoint[];
  color?: string;
  height?: number;
  unit?: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;

  const m = { top: 16, right: 44, bottom: 28, left: 36 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const maxY = niceMax(Math.max(...points.map((p) => p.y)));
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const sx = (x: number) => m.left + (maxX === minX ? innerW / 2 : ((x - minX) / (maxX - minX)) * innerW);
  const sy = (y: number) => m.top + innerH - (y / maxY) * innerH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(maxX).toFixed(1)},${sy(0)} L${sx(minX).toFixed(1)},${sy(0)} Z`;
  const last = points[points.length - 1];
  const step = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 48))));

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    const x = event.clientX - bounds.left;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(sx(p.x) - x) < Math.abs(sx(points[nearest].x) - x)) nearest = i;
    });
    setHover(nearest);
  };

  const active = hover !== null ? points[hover] : null;

  return (
    <figure ref={ref} className="relative" aria-label={`Puntos acumulados: ${points.map((p) => `partido ${p.x}, ${p.y}`).join('; ')}`}>
      <svg width={width} height={height} role="img" className="block overflow-visible">
        {ticks(maxY).map((tick) => (
          <g key={tick}>
            <line x1={m.left} x2={width - m.right} y1={sy(tick)} y2={sy(tick)} stroke="var(--line)" strokeWidth={1} />
            <text x={m.left - 8} y={sy(tick)} dy="0.32em" textAnchor="end" className="tabular fill-subtle text-[11px]">
              {compact(tick)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % step === 0 || i === points.length - 1 ? (
            <text key={p.x} x={sx(p.x)} y={height - 8} textAnchor="middle" className="tabular fill-subtle text-[11px]">
              {p.x}
            </text>
          ) : null,
        )}
        <path d={area} fill={color} fillOpacity={0.1} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={sx(last.x)} cy={sy(last.y)} r={4.5} fill={color} stroke="var(--elevated)" strokeWidth={2} />
        <text x={sx(last.x) + 10} y={sy(last.y)} dy="0.32em" className="tabular fill-fg text-[12px] font-semibold">
          {last.y}
        </text>
        {active && (
          <g pointerEvents="none">
            <line x1={sx(active.x)} x2={sx(active.x)} y1={m.top} y2={m.top + innerH} stroke="var(--line-strong)" strokeWidth={1} />
            <circle cx={sx(active.x)} cy={sy(active.y)} r={4.5} fill={color} stroke="var(--elevated)" strokeWidth={2} />
          </g>
        )}
        <rect
          x={m.left}
          y={m.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-elevated px-3 py-2 text-xs shadow-md"
          style={{ left: Math.min(Math.max(sx(active.x), 70), width - 70) }}
        >
          <p className="tabular text-sm font-semibold text-fg">
            {active.y} {unit}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-muted">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
            Partido {active.x}
            {active.label ? ` · ${RESULT[active.label] ?? active.label}` : ''}
          </p>
        </div>
      )}
      <p className="mt-1 text-center text-[11px] text-subtle">Partidos jugados</p>
      <table className="sr-only">
        <caption>Puntos acumulados por partido</caption>
        <thead>
          <tr>
            <th>Partido</th>
            <th>Puntos acumulados</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.x}>
              <td>{p.x}</td>
              <td>{p.y}</td>
              <td>{p.label ? (RESULT[p.label] ?? p.label) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
