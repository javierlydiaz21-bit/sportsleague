'use client';

import { useState } from 'react';
import { compact, niceMax, ticks, useWidth } from './use-width';

export interface Column {
  key: string;
  label: string;
  detail?: string;
  value: number;
}

/** Columnas de una sola serie (magnitud): ≤24px, extremo redondeado de 4px, tooltip por barra. */
export function ColumnChart({
  data,
  color = '#2a78d6',
  height = 220,
  unit = '',
  caption,
}: {
  data: Column[];
  color?: string;
  height?: number;
  unit?: string;
  caption: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const m = { top: 20, right: 12, bottom: 28, left: 40 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const maxY = niceMax(Math.max(...data.map((d) => d.value)));
  const band = innerW / data.length;
  const barW = Math.max(2, Math.min(24, band - 2));
  const sy = (v: number) => m.top + innerH - (v / maxY) * innerH;
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const step = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 40))));

  const barPath = (x: number, y: number, w: number) => {
    const base = sy(0);
    const r = Math.min(4, Math.max(0, base - y), w / 2);
    return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
  };

  const active = hover !== null ? data[hover] : null;
  const activeX = hover !== null ? m.left + band * hover + band / 2 : 0;

  return (
    <figure ref={ref} className="relative" aria-label={caption}>
      <svg width={width} height={height} role="img" className="block overflow-visible">
        {ticks(maxY).map((tick) => (
          <g key={tick}>
            <line x1={m.left} x2={width - m.right} y1={sy(tick)} y2={sy(tick)} stroke="var(--line)" strokeWidth={1} />
            <text x={m.left - 8} y={sy(tick)} dy="0.32em" textAnchor="end" className="tabular fill-subtle text-[11px]">
              {compact(tick)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = m.left + band * i + (band - barW) / 2;
          const y = sy(d.value);
          return (
            <g key={d.key}>
              <path d={barPath(x, y, barW)} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
              {i === peak && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="tabular fill-fg text-[11px] font-semibold">
                  {compact(d.value)}
                </text>
              )}
              {i % step === 0 && (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="tabular fill-subtle text-[11px]">
                  {d.label}
                </text>
              )}
              <rect
                x={m.left + band * i}
                y={m.top}
                width={band}
                height={innerH}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-elevated px-3 py-2 text-xs shadow-md"
          style={{ left: Math.min(Math.max(activeX, 80), width - 80) }}
        >
          <p className="tabular text-sm font-semibold text-fg">
            {active.value.toLocaleString('es-CO')} {unit}
          </p>
          <p className="mt-0.5 max-w-48 truncate text-muted">{active.detail ?? active.label}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{d.detail ?? d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
