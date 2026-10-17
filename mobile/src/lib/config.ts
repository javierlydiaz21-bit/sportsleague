/**
 * Configuración de la app. Las variables EXPO_PUBLIC_* se incrustan al empaquetar (Metro las sustituye
 * en tiempo de compilación), así que tras cambiarlas hay que reiniciar `npx expo start`.
 */
const DEFAULT_API_URL = 'https://sportsleague-jd-gateway.onrender.com/api/v1';
const DEFAULT_WS_URL = 'https://sportsleague-jd-live.onrender.com';

const withoutTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');

/** URL base del API Gateway, con el prefijo /api/v1. */
export const API_URL = withoutTrailingSlash(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL);

/** URL del Live Score Service (Socket.IO). */
export const WS_URL = withoutTrailingSlash(process.env.EXPO_PUBLIC_WS_URL || DEFAULT_WS_URL);

/** Healthcheck del gateway (sin /api/v1): en Render Free sirve para despertar los servicios. */
export const HEALTH_URL = `${API_URL.replace(/\/api\/v\d+$/, '')}/health`;

/** Canal del documento de arquitectura (alias de /live en el Live Score Service). */
export const WS_NAMESPACE = '/live-scores';
/** Canal original: se usa si el servidor aún no tiene el alias /live-scores desplegado. */
export const WS_FALLBACK_NAMESPACE = '/live';

/** Desfase horario de las ligas (igual que NEXT_PUBLIC_UTC_OFFSET en la web: Colombia, UTC−5). */
export const UTC_OFFSET = process.env.EXPO_PUBLIC_UTC_OFFSET || '-05:00';
