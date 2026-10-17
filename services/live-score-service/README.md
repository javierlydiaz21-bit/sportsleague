# Live Score Service · SportsLeague

Microservicio de marcador en vivo de **SportsLeague**, la plataforma de gestión de ligas deportivas
amateur (fútbol, básquet y vóley). Recibe por REST los eventos del partido (goles, tarjetas y
sustituciones) que registra el árbitro asignado o el organizador, los difunde al instante por WebSocket
(Socket.IO, namespace `/live` y su alias `/live-scores`) a los espectadores y, al finalizar, publica el
acta oficial versionada (`match.completed`) para que la tabla de posiciones se recalcule.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4006 (HTTP y WebSocket) | `livescore_db` | [sportsleague-live-score-service](https://github.com/javierlydiaz21-bit/sportsleague-live-score-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Inicia el partido**: consulta al Fixture Service que el calendario esté publicado y que el partido no
  esté suspendido ni finalizado, crea el acta (`live_matches`), guarda en caché las plantillas de los dos
  equipos y publica `match.started`.
- **Registra eventos** `GOAL`, `YELLOW_CARD`, `RED_CARD` y `SUBSTITUTION` (minuto de 0 a 200; en básquet
  un tanto vale 1, 2 o 3 con `value`; la sustitución exige el jugador que sale y el que entra). Comprueba
  que el equipo juegue el partido y que los jugadores sean de su plantilla.
- **Permisos diferenciados**: pueden operar el partido el organizador de la liga, el administrador y el
  **árbitro asignado** (verificado contra el Referee Service y guardado 5 minutos en caché). Tras el
  cierre, solo el organizador o el administrador corrigen el acta.
- **El marcador no se almacena**: se deriva siempre de `match_events`.
- **Finaliza el partido** con la asistencia (`attendance`), notas y el pico de espectadores conectados, y
  publica el acta con `match.completed` (versión 1). Cada corrección posterior vuelve a publicar el acta
  con una versión nueva.
- **WebSocket**: salas por partido en el namespace `/live` (y `/live-scores`, el nombre del documento de
  arquitectura); conteo global de espectadores en Redis, compartido entre réplicas.
- **Escalado horizontal**: el registro llega por HTTP, se publica `match.event` en Redis y **todas** las
  réplicas lo reciben y lo difunden a sus sockets conectados.
- Si recibe `match.suspended`, pasa a `SUSPENDED` el acta en vivo.

**Qué no hace**

- No crea ni reprograma partidos (Fixture), no asigna árbitros (Referee) y no calcula la tabla
  (Statistics).

**Por qué es un servicio aparte**: es el servicio con más carga y que más exige baja latencia (varias
jornadas a la vez y muchos espectadores conectados). Separarlo permite escalarlo solo, sin arrastrar al
resto. Además, si el Team Service cae durante un partido, el registro de eventos no se bloquea (usa la
plantilla guardada al iniciar).

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`, `@nestjs/websockets`, `@nestjs/platform-socket.io`) | Framework HTTP y WebSocket |
| Socket.IO | 4.8 (`socket.io ^4.8.4`) | Difusión del marcador en tiempo real |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `livescore_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub) entre réplicas, caché de plantillas y permisos, conteo de espectadores, trazas |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest + socket.io-client | 29 / 7 / 4.8 | Pruebas unitarias, de integración HTTP y de WebSocket |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
live-score-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis y adaptador Socket.IO (puerto 4006)
│   ├── app.module.ts         módulo raíz
│   ├── live/
│   │   ├── live.controller.ts    rutas REST
│   │   ├── live.service.ts       operación del partido, actas y permisos
│   │   ├── live.gateway.ts       canales WebSocket /live y /live-scores
│   │   ├── io.adapter.ts         orígenes permitidos del WebSocket (WS_ALLOWED_ORIGINS)
│   │   ├── viewers.service.ts    espectadores por partido (Redis)
│   │   ├── score.ts              cálculo del marcador (lógica pura)
│   │   ├── clients.ts            clientes REST de Fixture, Referee y Team
│   │   ├── metrics.ts            métricas del dominio
│   │   └── dto.ts                validación de entradas
│   ├── prisma/               PrismaService (conexión y health check de la base)
│   └── chassis/              código común copiado del repositorio principal; no se edita aquí
├── prisma/
│   ├── schema.prisma         modelo de datos
│   └── migrations/           migraciones SQL (se aplican al arrancar)
├── database/                 esquema, datos de ejemplo y respaldo en SQL (ver «Base de datos»)
├── test/                     pruebas de integración HTTP y WebSocket (*.e2e.spec.ts)
├── Dockerfile                imagen multietapa; aplica las migraciones antes de arrancar
├── .env.example              variables para ejecutar fuera de Docker
├── package.json              scripts (build, start:dev, lint, test…) y dependencias
└── eslint.config.mjs, tsconfig.json, tsconfig.build.json, nest-cli.json
```

`src/chassis/` es el *microservice chassis* (logs JSON, métricas, `/health`, guard de autenticación,
bus de eventos, caché, cliente REST resiliente y validación). Se mantiene en la carpeta `chassis/` del
repositorio principal y se copia a cada servicio con `node scripts/sync-chassis.mjs`.

## Instalación y ejecución

El servicio escucha en el puerto **4006** (HTTP y WebSocket en el mismo puerto). En las tres opciones la
comprobación es `GET http://localhost:4006/health`, que responde `200` con
`{"status":"ok","service":"live-score-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
`"degraded"` si falla la base de datos o Redis).

### a) Todo el sistema con Docker (recomendado)

Solo necesitas Docker Desktop (o Docker Engine con el plugin compose).

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague.git
cd sportsleague
```

- **Windows**: `powershell -NoProfile -ExecutionPolicy Bypass -File .\iniciar.ps1` (o doble clic en
  `iniciar.bat`). Construye las imágenes, arranca todo, carga la liga de demostración y abre
  http://localhost:3000.
- **Linux / macOS**: `sh iniciar.sh`.
- **Manual**: `docker compose up -d --build` y, para los datos de demostración,
  `docker compose --profile demo run --rm seed`.

La primera construcción tarda entre 10 y 20 minutos. Este servicio publica el puerto 4006 en Docker
Compose (es el canal WebSocket de los espectadores), así que se comprueba directamente:

```bash
curl http://localhost:4006/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles, y el Fixture, el Referee y el Team Service para iniciar
partidos. Lo más sencillo es levantar la infraestructura del repositorio principal con
`docker compose up -d postgres redis`: PostgreSQL y Redis quedan en `127.0.0.1:5440` y `127.0.0.1:6380`,
con la base `livescore_db` y su usuario `livescore_user` ya creados.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-live-score-service.git
cd sportsleague-live-score-service
docker build -t sportsleague-live-score-service .
docker run --rm -p 4006:4006 \
  -e DATABASE_URL=postgresql://livescore_user:sl_dev_pass@host.docker.internal:5440/livescore_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e FIXTURE_SERVICE_URL=http://host.docker.internal:4004 \
  -e REFEREE_SERVICE_URL=http://host.docker.internal:4005 \
  -e TEAM_SERVICE_URL=http://host.docker.internal:4003 \
  -e WS_ALLOWED_ORIGINS=http://localhost:3000 \
  sportsleague-live-score-service
curl http://localhost:4006/health
```

El contenedor ejecuta `npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal`
apunta al equipo anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`.
En PowerShell, cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440`, `localhost:6380` y a Fixture, Referee y Team en
`localhost:4004`, `4005` y `4003`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu PostgreSQL o tu Redis son otros
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4006/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo (y, para las rutas con sesión, las cabeceras `x-user-id`,
`x-user-role`, `x-user-email` que pondría el gateway):

```bash
curl http://localhost:4006/api/v1/live/matches -H "x-internal-token: dev-internal-token-change-me"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP y WebSocket)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL, Redis ni los otros servicios: usan dobles en memoria y un cliente
Socket.IO real. Cubren el cálculo del marcador (también canastas de 2 y 3 puntos), los permisos del
árbitro asignado, la validación de equipo y plantilla, el acta versionada y sus correcciones, y la
difusión por WebSocket en `/live` y `/live-scores`. En el pipeline de CI también se ejecuta una prueba de
carga con k6 (`load-tests/live-score.js` del repositorio principal) que simula varias jornadas a la vez.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/matches/:id/start` | Sesión (árbitro asignado, organizador o `ADMIN`) | Inicia el partido y devuelve su estado. Publica `match.started`. |
| POST | `/api/v1/matches/:id/events` | Sesión (árbitro asignado, organizador o `ADMIN`) | Registra un evento (`type`, `teamId`, `playerId`, `playerInId`, `minute`, `value`) y devuelve el evento y el marcador. Publica `match.event` (y, si el partido ya terminó, `match.completed` con versión nueva). |
| DELETE | `/api/v1/matches/:id/events/:eventId` | Sesión (árbitro asignado, organizador o `ADMIN`) | Borra un evento. Publica `match.event.deleted` (y `match.completed` si es una corrección del acta). |
| POST | `/api/v1/matches/:id/complete` | Sesión (árbitro asignado, organizador o `ADMIN`) | Finaliza el partido (`attendance`, `notes`). Publica `match.completed`. |
| GET | `/api/v1/matches/:id/live` | Público | Estado actual: marcador, eventos, estado (`NOT_STARTED`, `LIVE`, `FINISHED` o `SUSPENDED`), versión del acta y espectadores conectados. |
| GET | `/api/v1/live/matches` | Público | Actas con su marcador, filtradas por `ids`, `leagueId`, `seasonId`, `categoryId` y `status`; `includeEvents=true` añade todos los eventos (si no, solo los goles); `limit` hasta 500. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos (Fixture, Referee y Team) y suscripciones; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus, incluidas `match_events_registered_total{type,league_id,season_id,category_id}`, `live_score_update_latency_seconds`, `live_ws_connections` y `live_viewers_total`. |

En el gateway, `/api/v1/matches/:id/events`, `/live`, `/start` y `/complete` y todo `/api/v1/live/*` se
envían a este servicio; el resto de `/api/v1/matches/*` va al Fixture Service.

### WebSocket (Socket.IO)

El WebSocket **no pasa por el gateway**: el cliente se conecta directamente a este servicio
(`http://localhost:4006` en Docker Compose, https://sportsleague-jd-live.onrender.com en Render), en el
namespace `/live` o en su alias `/live-scores`. Solo se aceptan conexiones de los orígenes de
`WS_ALLOWED_ORIGINS` (CORS de Socket.IO y `allowRequest`, también para el WebSocket), de clientes sin
cabecera `Origin` y de la app móvil, que envía como origen el propio host del servicio (ping cada 20 s).

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4006/live');
socket.emit('subscribe', { matchId: '<uuid-del-partido>' }, (ack) => console.log(ack));
socket.on('match:event', (data) => console.log('evento', data));
```

| Dirección | Mensaje | Contenido |
|---|---|---|
| Cliente → servidor | `subscribe` | `{ matchId }` (UUID). Máximo 20 partidos por conexión. Responde `{ ok }` y envía `match:snapshot`. |
| Cliente → servidor | `unsubscribe` | `{ matchId }`. |
| Servidor → cliente | `match:snapshot` | Estado completo del partido; al suscribirse y cuando llegan `match.started`, `match.completed` o `match.suspended`. |
| Servidor → cliente | `match:event` | Los datos de `match.event` (evento, marcador y `registeredAt`). |
| Servidor → cliente | `match:event-deleted` | `{ matchId, eventId, score, registeredAt }`. |
| Servidor → cliente | `viewers` | `{ matchId, count }`: espectadores conectados al partido. |

## Eventos

Se publican y consumen en **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre
JSON (`id`, `type`, `version`, `source`, `occurredAt`, `requestId`, `data`). Cada evento publicado también
se guarda en la lista `events:recent` (últimos 200) que muestra el panel de administración.

**Publica**

| Evento (canal) | Cuándo | Datos (`data`) | Quién lo consume |
|---|---|---|---|
| `match.started` | Al iniciar el partido | `matchId`, `leagueId`, `seasonId`, `categoryId`, `ownerId`, `homeTeamId`, `awayTeamId`, `startedAt` | Fixture (pasa el partido a `LIVE`), Live Score (envía el estado a los sockets) |
| `match.event` | Por cada evento registrado | `eventId`, `matchId`, `leagueId`, `seasonId`, `categoryId`, `type`, `teamId`, `playerId`, `playerInId`, `minute`, `value`, `score`, `registeredAt`, `event` | Live Score (todas las réplicas lo difunden por WebSocket), Statistics (solo cuenta los eventos en una métrica) |
| `match.event.deleted` | Al borrar un evento | `matchId`, `eventId`, `score`, `registeredAt` | Live Score (WebSocket) |
| `match.completed` | Al finalizar (versión 1) y en cada corrección posterior (versión + 1) | `matchId`, `leagueId`, `seasonId`, `categoryId`, `ownerId`, `homeTeamId`, `awayTeamId`, `homeScore`, `awayScore`, `version`, `reason` (`final` o `correction`), `completedAt`, `attendance`, `events[]` | Statistics (recalcula la tabla), Fixture (`FINISHED`), Referee (proyección `FINISHED`), Notification (resultado final), Live Score (estado a los sockets) |

**Consume**

| Evento (canal) | Lo publica | Qué hace |
|---|---|---|
| `match.suspended` | Fixture | Pasa el acta en vivo a `SUSPENDED` y envía el estado actualizado a la sala del partido. |
| `match.event` y `match.event.deleted` | Live Score (sus propios eventos) | Los difunde por WebSocket a la sala del partido y mide la latencia desde el registro (`live_score_update_latency_seconds`). |
| `match.started` y `match.completed` | Live Score (sus propios eventos) | Envía `match:snapshot` a la sala del partido. |

## Comunicación con otros servicios

**Llamadas que hace** (REST síncrono con el `ServiceClient` del chassis): timeout por llamada, reintentos
con backoff exponencial (150 ms, 300 ms… con variación aleatoria; solo en lecturas) y circuit breaker
(se abre tras 5 fallos seguidos, rechaza durante 15 s y luego deja pasar una llamada de prueba). Un error
`4xx` del servicio llamado no cuenta como fallo.

| Destino | Llamada | Para qué | Timeout | Reintentos |
|---|---|---|---|---|
| Fixture Service | `GET /api/v1/matches/:id` (con la identidad del usuario) | Al iniciar: equipos, organizador, estado del partido y del calendario | 2500 ms | 2 |
| Referee Service | `GET /api/v1/internal/assignments/check?matchId=&email=` | ¿El árbitro que opera está asignado? (resultado positivo en caché 5 min, clave `live:referee-check:<partido>:<correo>`) | 1500 ms | 2 |
| Team Service | `GET /api/v1/players?teamIds=` | Plantillas de los dos equipos (caché 24 h, clave `live:roster:<partido>`); si Team no responde, el registro no se bloquea | 1500 ms | 1 |

**Llamadas que recibe**: el Statistics Service consulta `GET /api/v1/live/matches` (actas finalizadas con
sus eventos) para reconciliar la tabla. El Analytics Service lee las tablas `live_matches` y
`match_events` con su usuario de solo lectura `analytics_ro`.

## Base de datos

Base propia **`livescore_db`** en PostgreSQL 16 (usuario `livescore_user` en Docker Compose). Ningún otro
servicio puede escribir en ella; el usuario `analytics_ro` solo tiene permiso de lectura (`SELECT`) para
el ETL del Analytics Service. Tipos enumerados: `LiveStatus` (`LIVE`, `FINISHED`, `SUSPENDED`) y
`EventType` (`GOAL`, `YELLOW_CARD`, `RED_CARD`, `SUBSTITUTION`).

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `live_matches` | `match_id` (PK, el mismo id del partido en Fixture), `league_id`, `season_id`, `category_id`, `owner_id`, `home_team_id`, `away_team_id`, `status` (por defecto `LIVE`), `started_at`, `finished_at`, `attendance`, `peak_viewers`, `notes`, `version` (versión del acta) | Índices `live_matches_league_id_idx`, `live_matches_season_id_category_id_idx` y `live_matches_status_idx` |
| `match_events` | `id` (UUID, PK), `match_id`, `type`, `team_id`, `player_id`, `player_in_id`, `minute`, `value` (por defecto 1), `created_by`, `created_at` | Índices `match_events_match_id_idx` y `match_events_match_id_minute_idx`; FK `match_id` → `live_matches.match_id` con `ON DELETE CASCADE` |

En Redis guarda además datos efímeros: `live:viewers:<partido>` y `live:viewers-peak:<partido>`
(espectadores), `live:roster:<partido>` y `live:referee-check:…` (cachés).

Las migraciones están en `prisma/migrations/` (`20261011000000_init`) y se aplican solas al arrancar con
`npx prisma migrate deploy`; Prisma registra las aplicadas en la tabla `_prisma_migrations`.

### Carpeta `database/`

| Archivo | Contenido | Generado con |
|---|---|---|
| `database/esquema.sql` | Solo el esquema (tipos, tablas, índices y llaves) | `pg_dump --schema-only` |
| `database/datos-ejemplo.sql` | Datos de la liga de demostración | `pg_dump --data-only --column-inserts` |
| `database/respaldo.sql` | Respaldo completo (borra y recrea los objetos) | `pg_dump --clean --if-exists --no-owner --no-privileges` |

Restaurar el respaldo con el usuario del servicio (el de `DATABASE_URL`), para que las tablas queden a su
nombre:

```bash
psql "$DATABASE_URL" -f database/respaldo.sql
```

Generar un respaldo nuevo desde la pila de Docker (en la raíz del repositorio principal):

```bash
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges livescore_db > services/live-score-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4006` | Puerto HTTP y WebSocket. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://livescore_user:sl_dev_pass@postgres:5432/livescore_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `livescore_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos, cachés, espectadores y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios; también se envía en las llamadas a Fixture, Referee y Team. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `FIXTURE_SERVICE_URL` | No | `http://localhost:4004` | URL del Fixture Service (acepta `http://host:puerto` o solo `host:puerto`). Docker Compose: `http://fixture-service:4004`. |
| `REFEREE_SERVICE_URL` | No | `http://localhost:4005` | URL del Referee Service. Docker Compose: `http://referee-service:4005`. |
| `TEAM_SERVICE_URL` | No | `http://localhost:4003` | URL del Team Service. Docker Compose: `http://team-service:4003`. |
| `WS_ALLOWED_ORIGINS` | No | `http://localhost:3000` | Webs que pueden abrir el WebSocket, separadas por comas; las demás se rechazan. Render: `https://sportsleague-cyan.vercel.app`. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `live-score-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId` (trazabilidad por partido). |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; este
servicio no las usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-live-score-service`, publicada por
  GitHub Actions desde el repositorio principal (`.github/workflows/live-score-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → prueba de carga con
  k6 → imagen en GHCR con las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en
  Render con el *deploy hook* del secreto `RENDER_DEPLOY_HOOK_LIVE_SCORE`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-live.onrender.com. Es la URL del
  WebSocket que usa la web (`NEXT_PUBLIC_WS_URL` en Vercel). Usa la PostgreSQL gratuita compartida
  `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y el Key Value `sportsleague-jd-redis`.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. Un servicio
  dormido no recibe los eventos de Redis. La PostgreSQL gratuita caduca a los 30 días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
