# SportsLeague móvil (Expo)

App móvil de SportsLeague hecha con React Native y Expo. Es la pieza del documento de arquitectura
que dice «React Native para la app de árbitros y la app de espectadores, con actualizaciones en vivo
vía WebSockets». Es una sola app con dos modos:

- **Espectador** (no hace falta iniciar sesión):
  - «En vivo»: los partidos en curso.
  - «Próximos»: los partidos programados, agrupados por día.
  - Detalle de cada partido: marcador en tiempo real, minuto a minuto, espectadores conectados y plantillas.
- **Árbitro** (con sesión):
  - «Mis partidos»: sus asignaciones, que puede confirmar o rechazar.
  - Control en vivo del partido: iniciarlo; registrar goles, tarjetas amarillas y rojas y
    sustituciones (equipo, jugador y minuto); borrar un evento; y finalizarlo con la asistencia y
    las observaciones.

Si inicia sesión alguien que no es árbitro (organizador, aficionado o administrador), la app muestra
el modo espectador con su nombre y el botón «Cerrar sesión». La gestión de ligas sigue en la web.

La app usa las mismas llamadas que la web (`frontend/`): todo pasa por el API Gateway y el marcador
llega por Socket.IO desde el Live Score Service.

## Requisitos

- Node.js 22.13 o posterior (o 24.3 o posterior).
- Un teléfono Android o iPhone con **Expo Go** instalado desde Google Play o la App Store. La app
  usa el **SDK 58** de Expo. Si Expo Go dice que el proyecto no es compatible, actualiza Expo Go.
- El teléfono y el PC en la misma red wifi (solo para el modo desarrollo con `npx expo start`).

## Ejecutar con Expo Go

```bash
cd mobile
npm install
npx expo start
```

En la terminal aparece un código QR:

- **Android**: abre Expo Go y pulsa «Scan QR code».
- **iPhone**: escanea el QR con la cámara y abre el enlace con Expo Go.

La primera carga tarda un poco: Metro empaqueta la app y el teléfono la descarga. Con `r` en la
terminal se recarga la app y con `npx expo start --clear` se borra la caché de Metro.

Si el teléfono no llega al PC (red de invitados, wifi de la universidad con aislamiento entre
equipos…), usa `npx expo start --tunnel`. La primera vez Expo pide instalar `@expo/ngrok`.

Por defecto la app usa la **producción** (Render y Vercel), así que funciona sin levantar nada en el PC.

## Variables de entorno

| Variable | Por defecto | Para qué sirve |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://sportsleague-jd-gateway.onrender.com/api/v1` | URL del API Gateway, **con** `/api/v1` |
| `EXPO_PUBLIC_WS_URL` | `https://sportsleague-jd-live.onrender.com` | URL del Live Score Service (Socket.IO, namespace `/live-scores`) |
| `EXPO_PUBLIC_UTC_OFFSET` | `-05:00` | Desfase horario con el que se muestran las fechas (como en la web) |

Las `EXPO_PUBLIC_*` se incrustan al empaquetar. Después de cambiarlas, reinicia con
`npx expo start --clear`. La pestaña «Cuenta» (o «Árbitros») muestra al pie el servidor que usa la app.

### Apuntar la app a la pila local de Docker

El teléfono no ve el `localhost` del PC: para él, `localhost` es el propio teléfono. Hay que usar la
IP del PC en la red local.

1. Levanta la pila con `iniciar.ps1` (ver el README de la raíz).
2. Busca la IP del PC: en Windows, `ipconfig` (campo «Dirección IPv4» del adaptador wifi, por ejemplo
   `192.168.1.50`); en Linux o macOS, `ip addr` o `ifconfig`.
3. Crea `mobile/.env.local` (no se sube a git) con esa IP:

   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.50:4000/api/v1
   EXPO_PUBLIC_WS_URL=http://192.168.1.50:4006
   ```

4. Ejecuta `npx expo start --clear` y vuelve a escanear el QR.

Si el teléfono no carga los datos, abre `http://192.168.1.50:4000/health` en su navegador. Si no
responde, permite los puertos 4000 y 4006 en el Firewall de Windows para redes privadas.

El gateway solo admite el origen de la web en CORS, pero eso no afecta a la app: CORS es una regla de
los navegadores y el `fetch` de React Native no envía la cabecera `Origin`.

## Cuentas de prueba

Con los datos de demostración (`scripts/seed-demo.mjs`):

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Árbitro | `arbitro@demo.com` | `Demo12345` |
| Organizador (ve el modo espectador) | `organizador@demo.com` | `Demo12345` |
| Aficionado (ve el modo espectador) | `aficionado@demo.com` | `Demo12345` |

## Render Free: los servicios se duermen

En el plan gratuito de Render cada servicio se duerme tras unos 15 minutos sin tráfico y tarda entre
30 y 60 segundos en despertar. La app lo tiene en cuenta:

- Al abrirse hace `GET /health` al gateway, que despierta a los demás servicios.
- Si una respuesta es 502, 503 o 504, o hay un error de red, muestra «Los servicios se están
  despertando, espera unos segundos…» con el botón «Reintentar». También reintenta sola cada 15 s.
- Si el WebSocket no conecta, el marcador muestra «Reconectando…» y se consulta por HTTP cada 10 s
  hasta que vuelva la conexión en vivo.

## Sesión

- El inicio de sesión envía `client: 'mobile'`, así que el refresh token llega en el cuerpo de la
  respuesta. La web, en cambio, lo recibe en una cookie.
- El access token, el refresh token y el usuario se guardan cifrados con `expo-secure-store`
  (Keychain en iOS, Keystore en Android).
- Si una petición responde 401, la app renueva el token una vez con `POST /auth/refresh` y la repite.
  Si la renovación también falla, cierra la sesión.

## Pantallas y endpoints

| Pantalla | Archivo | Llamadas |
| --- | --- | --- |
| Al abrir la app | `src/app/_layout.tsx` | `GET /health` (sin `/api/v1`) |
| En vivo | `src/app/(tabs)/index.tsx` | `GET /live/matches?status=LIVE&limit=50`, `GET /teams?ids=…`, `GET /leagues?ids=…` (se actualiza cada 30 s) |
| Próximos | `src/app/(tabs)/proximos.tsx` | `GET /matches?status=SCHEDULED&from=<ahora>&limit=40`, `GET /teams?ids=…`, `GET /leagues?ids=…` |
| Detalle del partido | `src/app/partido/[id].tsx` | `GET /matches/:id`, `GET /teams?ids=…`, `GET /players?teamIds=…`, `GET /leagues/:id`, `GET /matches/:id/live` y Socket.IO |
| Árbitros / Cuenta | `src/app/(tabs)/cuenta.tsx` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh` |
| Mis partidos | `src/app/(tabs)/mis-partidos.tsx` | `GET /assignments/mine`, `GET /referees/me`, `PUT /assignments/:id/confirm` |
| Control del partido | `src/app/arbitro/[id].tsx` | Las del detalle, más `POST /matches/:id/start`, `POST /matches/:id/events`, `DELETE /matches/:id/events/:eventId` y `POST /matches/:id/complete` |

El WebSocket se conecta a `EXPO_PUBLIC_WS_URL` con el namespace `/live-scores`. Si el servidor todavía
no tiene ese alias, usa `/live`. La app emite `subscribe` con `{ matchId }` y escucha
`match:snapshot`, `match:event`, `match:event-deleted` y `viewers`.

## Estructura

```text
mobile/
├── app.json               Configuración de Expo (nombre, iconos, splash, plugins)
├── assets/images/         Icono, icono adaptable de Android, splash y favicon
├── src/app/               Pantallas (expo-router: cada archivo es una ruta)
│   ├── _layout.tsx        Proveedores (sesión, avisos) y navegación en pila
│   ├── (tabs)/            Pestañas: En vivo, Próximos, Mis partidos y Cuenta
│   ├── partido/[id].tsx   Detalle del partido (espectador)
│   └── arbitro/[id].tsx   Control del partido (árbitro)
├── src/components/        Componentes de interfaz (marcador, línea de tiempo, tarjetas…)
├── src/constants/theme.ts Colores (vino de la web), espaciados y radios
└── src/lib/               API, sesión, WebSocket, formatos y tipos
```

## Verificar

```bash
npm run lint        # ESLint (eslint-config-expo)
npm run typecheck   # tsc --noEmit
npx expo export --platform android   # comprueba que el paquete de Android compila
```

El workflow `.github/workflows/mobile.yml` ejecuta `npm ci`, el lint y la comprobación de tipos en
cada cambio dentro de `mobile/`.

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| «Los servicios se están despertando…» durante un minuto | Render Free estaba dormido. Espera y pulsa «Reintentar» (la app también reintenta sola). |
| Expo Go: «Project is incompatible with this version of Expo Go» | Expo Go no soporta el SDK 58. Actualízalo desde la tienda. |
| El QR abre la app, pero se queda cargando | El teléfono no llega al PC. Comprueba que estén en la misma wifi o usa `npx expo start --tunnel`. |
| Con la pila local no hay datos | En `.env.local` usaste `localhost`: pon la IP del PC y reinicia con `--clear`. Revisa también el firewall. |
| El marcador dice «Reconectando…» | El WebSocket no conecta: el servicio está despertando o rechazó la conexión. La app sigue actualizando el marcador por HTTP cada 10 s. |
| `npx expo start --web` no carga datos | El gateway solo admite en CORS el origen de la web (`http://localhost:3000`). La versión web de Expo sirve solo para pruebas: usa el teléfono. |
