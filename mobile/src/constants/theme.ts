/** Paleta de la app: el vino/borgoña de la web (constante WINE de LandingSimulator) sobre neutros cálidos. */
export const Colors = {
  wine: '#4a1222',
  wineDark: '#2a0811',
  wineSoft: '#f6ecef',
  wineLine: '#e6cfd6',
  bg: '#f7f5f4',
  card: '#ffffff',
  line: '#e7e2e0',
  lineStrong: '#d6cfcc',
  text: '#17171c',
  muted: '#5f5a57',
  subtle: '#8a8481',
  white: '#ffffff',
  live: '#dc2626',
  liveSoft: '#fef2f2',
  green: '#15803d',
  greenSoft: '#f0fdf4',
  amber: '#b45309',
  amberSoft: '#fffbeb',
  info: '#2563eb',
  infoSoft: '#eff6ff',
  yellowCard: '#facc15',
  redCard: '#ef4444',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Ancho máximo del contenido (en tabletas y en la versión web no se estira de lado a lado). */
export const MaxContentWidth = 640;
