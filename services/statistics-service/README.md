# Statistics Service · SportsLeague

Microservicio de estadísticas de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Mantiene la tabla de posiciones, la tabla de goleadores y el registro
disciplinario (tarjetas) de cada categoría y temporada, y los recalcula de forma idempotente a partir de
las actas oficiales que publica el Live Score Service con el evento `match.completed`.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4007 | `statistics_db` | [sportsleague-statistics-service](https://github.com/javierlydiaz21-bit/sportsleague-statistics-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Guarda cada acta** recibida en `match.completed` (marcador, versión y eventos) e ignora las versiones
  más antiguas que la que ya tiene: así se aplican las correcciones del acta y no se retrocede.
- **Recálculo idempotente**: no suma incrementos, sino que recalcula todo desde las actas guardadas y
  reemplaza las tablas de la categoría en una transacción. Procesar dos veces el mismo evento produce la
  misma tabla.
- **Tabla de posiciones**: partidos jugados, ganados, empatados y perdidos, goles a favor y en contra,
  diferencia de gol, puntos y racha de los últimos 5 resultados (G/E/P).
- **Puntos y desempates** según el reglamento de la categoría, que consulta al League Service (diferencia
  de gol, goles a favor, goles en contra, enfrentamiento directo y victorias, en el orden que defina el
  organizador; resuelve también los triples empates). El reglamento se guarda 1 h en caché; si el League
  Service no responde, usa el último conocido o el estándar (3/1/0, desempate por diferencia de gol, goles
  a favor y enfrentamiento directo).
- **Goleadores** y **registro disciplinario** (amarillas y rojas por jugador).
- Con `fixture.published` incluye en la tabla, con cero puntos, a los equipos que aún no aparecían; con
  `rules.updated` borra el reglamento en caché y recalcula todas las temporadas de esa categoría.
- **Caché en Redis** (5 minutos) para las consultas más visitadas, invalidada en cada recálculo.
- **Recalcular a mano con reconciliación**: vuelve a leer las actas oficiales del Live Score Service por
  si se perdió algún `match.completed` (Redis Pub/Sub prioriza la latencia sobre la garantía de entrega).

**Qué no hace**

- No registra los eventos del partido (Live Score), no define el reglamento (League) y no guarda nombres
  de equipos ni de jugadores: trabaja con ids y la web compone los nombres consultando al Team Service.

**Por qué es un servicio aparte**: las estadísticas son datos derivados que se pueden reconstruir en
cualquier momento. Separarlas permite servir la consulta más visitada (la tabla) desde caché sin cargar al
Live Score Service, y absorber la pérdida de eventos con el recálculo idempotente.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `statistics_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub), caché de tablas y reglamentos, trazas |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
statistics-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4007)
│   ├── app.module.ts         módulo raíz
│   ├── statistics/
│   │   ├── statistics.controller.ts
│   │   ├── statistics.service.ts   consumidores de eventos, recálculo, caché y consultas
│   │   ├── calculator.ts           tabla, desempates, goleadores y disciplina (lógica pura)
│   │   └── clients.ts              clientes REST del League y del Live Score Service
│   ├── prisma/               PrismaService (conexión y health check de la base)
│   └── chassis/              código común copiado del repositorio principal; no se edita aquí
├── prisma/
│   ├── schema.prisma         modelo de datos
│   └── migrations/           migraciones SQL (se aplican al arrancar)
├── database/                 esquema, datos de ejemplo y respaldo en SQL (ver «Base de datos»)
├── test/                     pruebas de integración HTTP (*.e2e.spec.ts)
├── Dockerfile                imagen multietapa; aplica las migraciones antes de arrancar
├── .env.example              variables para ejecutar fuera de Docker
├── package.json              scripts (build, start:dev, lint, test…) y dependencias
└── eslint.config.mjs, tsconfig.json, tsconfig.build.json, nest-cli.json
```

`src/chassis/` es el *microservice chassis* (logs JSON, métricas, `/health`, guard de autenticación,
bus de eventos, caché, cliente REST resiliente y validación). Se mantiene en la carpeta `chassis/` del
repositorio principal y se copia a cada servicio con `node scripts/sync-chassis.mjs`.

## Instalación y ejecución

El servicio escucha en el puerto **4007**. En las tres opciones la comprobación es
`GET http://localhost:4007/health`, que responde `200` con
`{"status":"ok","service":"statistics-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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

La primera construcción tarda entre 10 y 20 minutos. En Docker Compose este servicio vive en la red
privada (solo el gateway, el WebSocket y la web publican puertos), así que se comprueba desde dentro:

```bash
docker compose ps statistics-service                              # estado "healthy"
docker compose exec statistics-service wget -qO- http://127.0.0.1:4007/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles; el League y el Live Score Service son opcionales (sin League
usa el reglamento estándar y sin Live Score no se puede reconciliar). Lo más sencillo es levantar la
infraestructura del repositorio principal con `docker compose up -d postgres redis`: PostgreSQL y Redis
quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base `statistics_db` y su usuario `statistics_user`
ya creados.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-statistics-service.git
cd sportsleague-statistics-service
docker build -t sportsleague-statistics-service .
docker run --rm -p 4007:4007 \
  -e DATABASE_URL=postgresql://statistics_user:sl_dev_pass@host.docker.internal:5440/statistics_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e LEAGUE_SERVICE_URL=http://host.docker.internal:4002 \
  -e LIVE_SCORE_SERVICE_URL=http://host.docker.internal:4006 \
  sportsleague-statistics-service
curl http://localhost:4007/health
```

El contenedor ejecuta `npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal`
apunta al equipo anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`.
En PowerShell, cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440`, `localhost:6380` y a League y Live Score en
`localhost:4002` y `localhost:4006`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu PostgreSQL o tu Redis son otros
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4007/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo (y, para las rutas con sesión, las cabeceras `x-user-id`,
`x-user-role`, `x-user-email` que pondría el gateway):

```bash
curl http://localhost:4007/api/v1/standings/<uuid-de-la-temporada> -H "x-internal-token: dev-internal-token-change-me"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL, Redis ni los otros servicios: usan dobles en memoria. Cubren los
puntos por reglamento (incluido el de básquet), los desempates (diferencia de gol, goles a favor,
enfrentamiento directo y triple empate circular), la idempotencia, las correcciones del acta con
versiones antiguas ignoradas, el reglamento estándar cuando League no responde y la caché de la tabla.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/v1/standings/:seasonId` | Público | Tabla de posiciones de la temporada, ordenada por categoría y posición (filtro `categoryId`). Se sirve desde la caché de Redis. |
| GET | `/api/v1/top-scorers/:seasonId` | Público | Goleadores con al menos un gol (`categoryId`; `limit` de 1 a 100, por defecto 20). |
| GET | `/api/v1/disciplinary/:seasonId` | Público | Tarjetas amarillas y rojas por jugador (`categoryId`). |
| GET | `/api/v1/players/:id/disciplinary-record` | Público | Historial disciplinario de un jugador (`seasonId` opcional). |
| GET | `/api/v1/statistics/results/:seasonId` | Público | Resultados (actas) registrados en la temporada, con su versión (`categoryId`). |
| POST | `/api/v1/statistics/recalculate` | Sesión (organizador de la liga o `ADMIN`) | Recalcula la tabla de una categoría (`seasonId`, `categoryId`). Con `reconcile: true` primero trae del Live Score las actas que falten o estén desactualizadas. Devuelve `{ reconciled, standings }` y publica `standings.updated`. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos (League y Live Score) y suscripciones; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus, incluidas `standings_recalculations_total`, `standings_recalculation_duration_seconds`, `standings_cache_requests_total` y `live_events_observed_total`. |

En el gateway, `/api/v1/standings/*`, `/api/v1/top-scorers/*`, `/api/v1/disciplinary/*`,
`/api/v1/statistics/*` y `/api/v1/players/:id/disciplinary-record` se envían a este servicio.

## Eventos

Se publican y consumen en **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre
JSON (`id`, `type`, `version`, `source`, `occurredAt`, `requestId`, `data`). Cada evento publicado también
se guarda en la lista `events:recent` (últimos 200) que muestra el panel de administración.

**Publica**

| Evento (canal) | Cuándo | Datos (`data`) | Quién lo consume |
|---|---|---|---|
| `standings.updated` | Tras cada recálculo de una categoría | `seasonId`, `categoryId`, `reason` (`match.completed`, `fixture.published`, `rules.updated`, `manual` o `reconcile`), `leaderTeamId` | Ningún servicio lo consume por ahora; se ve en el panel *Eventos* del administrador |

**Consume**

| Evento (canal) | Lo publica | Qué hace |
|---|---|---|
| `match.completed` | Live Score | Guarda el acta (si su versión no es más antigua que la guardada) y recalcula la categoría. |
| `fixture.published` | Fixture | Si la jornada trae equipos que no están en la tabla, recalcula para incluirlos con cero puntos. |
| `rules.updated` | League | Borra el reglamento en caché y recalcula todas las temporadas de la categoría. |
| `match.event` | Live Score | Solo incrementa la métrica `live_events_observed_total` (por tipo de evento). |

## Comunicación con otros servicios

**Llamadas que hace** (REST síncrono con el `ServiceClient` del chassis): timeout por llamada, reintentos
con backoff exponencial (150 ms, 300 ms… con variación aleatoria; solo en lecturas) y circuit breaker
(se abre tras 5 fallos seguidos, rechaza durante 15 s y luego deja pasar una llamada de prueba). Un error
`4xx` del servicio llamado no cuenta como fallo.

| Destino | Llamada | Para qué | Timeout | Reintentos |
|---|---|---|---|---|
| League Service | `GET /api/v1/categories/:id/rules` | Reglamento de la categoría antes de recalcular (caché 1 h, clave `stats:rules:<categoría>`; si falla, el último o el estándar) | 2500 ms | 2 |
| League Service | `GET /api/v1/seasons/:id` (con la identidad del usuario) | Comprobar que quien pide el recálculo manual organiza la liga | 2500 ms | 2 |
| Live Score Service | `GET /api/v1/live/matches?seasonId=&categoryId=&status=FINISHED&includeEvents=true&limit=500` | Actas oficiales para la reconciliación | 4000 ms | 2 |

**Llamadas que recibe**: ningún otro microservicio lo llama por REST; solo el API Gateway. El Analytics
Service lee la tabla `match_results` con su usuario de solo lectura `analytics_ro`.

## Base de datos

Base propia **`statistics_db`** en PostgreSQL 16 (usuario `statistics_user` en Docker Compose). Ningún
otro servicio puede escribir en ella; el usuario `analytics_ro` solo tiene permiso de lectura (`SELECT`)
para el ETL del Analytics Service.

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `match_results` | `match_id` (PK), `league_id`, `season_id`, `category_id`, `owner_id`, `home_team_id`, `away_team_id`, `home_score`, `away_score`, `version`, `completed_at`, `events` (JSON), `updated_at` | Índice `match_results_season_id_category_id_idx`. Son las actas: la entrada del recálculo |
| `standings` | `id` (UUID, PK), `season_id`, `category_id`, `team_id`, `position`, `played`, `wins`, `draws`, `losses`, `goals_for`, `goals_against`, `goal_difference`, `points`, `form` (`text[]`), `updated_at` | Único `standings_season_id_category_id_team_id_key`; índice `standings_season_id_team_id_idx` |
| `top_scorers` | `id` (UUID, PK), `season_id`, `category_id`, `player_id`, `team_id`, `goals` | Único `top_scorers_season_id_category_id_player_id_key`; índice `top_scorers_season_id_goals_idx` |
| `disciplinary_records` | `id` (UUID, PK), `season_id`, `category_id`, `player_id`, `team_id`, `yellow_cards`, `red_cards` | Único `disciplinary_records_season_id_category_id_player_id_key`; índice `disciplinary_records_player_id_idx` |

En Redis guarda además las cachés `stats:standings:…`, `stats:scorers:…`, `stats:discipline:…` (5 min) y
`stats:rules:<categoría>` (1 h).

Las migraciones están en `prisma/migrations/` (`20261011000000_init`) y se aplican solas al arrancar con
`npx prisma migrate deploy`; Prisma registra las aplicadas en la tabla `_prisma_migrations`.

### Carpeta `database/`

| Archivo | Contenido | Generado con |
|---|---|---|
| `database/esquema.sql` | Solo el esquema (tablas, índices y llaves) | `pg_dump --schema-only` |
| `database/datos-ejemplo.sql` | Datos de la liga de demostración | `pg_dump --data-only --column-inserts` |
| `database/respaldo.sql` | Respaldo completo (borra y recrea los objetos) | `pg_dump --clean --if-exists --no-owner --no-privileges` |

Restaurar el respaldo con el usuario del servicio (el de `DATABASE_URL`), para que las tablas queden a su
nombre:

```bash
psql "$DATABASE_URL" -f database/respaldo.sql
```

Generar un respaldo nuevo desde la pila de Docker (en la raíz del repositorio principal):

```bash
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges statistics_db > services/statistics-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4007` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://statistics_user:sl_dev_pass@postgres:5432/statistics_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `statistics_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos, cachés y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios; también se envía en las llamadas a League y Live Score. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `LEAGUE_SERVICE_URL` | No | `http://localhost:4002` | URL del League Service (acepta `http://host:puerto` o solo `host:puerto`). Docker Compose: `http://league-service:4002`. |
| `LIVE_SCORE_SERVICE_URL` | No | `http://localhost:4006` | URL del Live Score Service. Docker Compose: `http://live-score-service:4006`. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `statistics-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId` (trazabilidad por partido). |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; este
servicio no las usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-statistics-service`, publicada por
  GitHub Actions desde el repositorio principal (`.github/workflows/statistics-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_STATISTICS`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-statistics.onrender.com. Usa la
  PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y el Key Value
  `sportsleague-jd-redis`; llama a League y Live Score por sus URL públicas. Es un servicio web público,
  pero sin `x-internal-token` solo responde `/health` y `/metrics`.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. Un servicio
  dormido no recibe los eventos de Redis: si falta algún resultado en la tabla, usa *Recalcular*
  (`POST /api/v1/statistics/recalculate` con `reconcile: true`). La PostgreSQL gratuita caduca a los 30
  días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
