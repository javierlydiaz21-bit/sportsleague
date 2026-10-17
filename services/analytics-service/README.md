# Analytics Service · SportsLeague

Microservicio de analítica de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Ejecuta un ETL periódico que lee, con un usuario de solo lectura, las bases de
Fixture, Live Score y Statistics (simulando las réplicas de lectura del documento de arquitectura) y
guarda en su propia base indicadores listos para consultar: asistencia estimada, partidos suspendidos,
tendencia de rendimiento de los equipos y KPIs por liga.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4009 | `analytics_db` | [sportsleague-analytics-service](https://github.com/javierlydiaz21-bit/sportsleague-analytics-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **ETL periódico** sobre réplicas de solo lectura:
  - **Extracción**: partidos de calendarios publicados (`fixture_db`: `matches` + `fixtures`), actas y
    eventos (`livescore_db`: `live_matches`, `match_events`) y resultados (`statistics_db`: `match_results`).
  - **Transformación**: asistencia estimada de cada partido finalizado (la reportada en el acta,
    `REPORTED`, o si no se reportó, el pico de espectadores conectados, `ONLINE_PEAK`); partidos
    suspendidos con su motivo; tendencia de cada equipo partido a partido (puntos y diferencia de gol
    acumulados); KPIs por liga (partidos por estado, goles, tarjetas, promedio de goles y de asistencia).
  - **Carga**: reescribe las tablas analíticas en una sola transacción y registra la corrida en `etl_runs`.
- Se ejecuta a los `ETL_INITIAL_DELAY_SECONDS` (20 s) de arrancar y después cada `ETL_INTERVAL_MINUTES`;
  el administrador también puede lanzarlo a mano.
- **Candado distribuido** en Redis (`analytics:etl-lock`, 120 s): si hay varias réplicas del servicio,
  solo una ejecuta el ETL a la vez.
- **Consultas**: KPIs globales de la plataforma (administrador), analítica de una liga (su organizador o
  el administrador) y tendencia de un equipo (pública).

**Qué no hace**

- No consume eventos ni llama por REST a otros servicios.
- Nunca escribe en las bases operativas: el usuario `analytics_ro` solo tiene permiso `SELECT` y
  `default_transaction_read_only = on`; cada réplica usa un pool de 2 conexiones con `statement_timeout`
  de 15 s.

**Por qué es un servicio aparte**: las consultas analíticas son pesadas y no deben competir con la
operación diaria. Por eso leen réplicas de solo lectura (en local, el usuario `analytics_ro`) y guardan
los resultados ya calculados en una base propia, de modo que las pantallas de analítica nunca consultan
las bases operativas.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones de la base propia |
| node-postgres (`pg`) | 8 | Consultas SQL de solo lectura a las réplicas |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `analytics_db` y réplicas leídas |
| Redis + ioredis | Redis 7, ioredis 5 | Candado distribuido del ETL, bus de eventos del chassis y trazas |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
analytics-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4009)
│   ├── app.module.ts         módulo raíz
│   ├── etl/
│   │   ├── analytics.controller.ts   rutas de consulta y del ETL
│   │   ├── analytics.service.ts      consultas sobre las tablas analíticas
│   │   ├── etl.service.ts            programación, candado, extracción y carga
│   │   ├── transform.ts              transformaciones (lógica pura)
│   │   └── replica-url.ts            URL completa o solo nombre de base para cada réplica
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

El servicio escucha en el puerto **4009**. En las tres opciones la comprobación es
`GET http://localhost:4009/health`, que responde `200` con
`{"status":"ok","service":"analytics-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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

La primera construcción tarda entre 10 y 20 minutos. En Docker Compose el ETL corre cada 2 minutos
(`ETL_INTERVAL_MINUTES=2`) y este servicio vive en la red privada (solo el gateway, el WebSocket y la web
publican puertos), así que se comprueba desde dentro:

```bash
docker compose ps analytics-service                               # estado "healthy"
docker compose exec analytics-service wget -qO- http://127.0.0.1:4009/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles. Lo más sencillo es levantar los del repositorio principal con
`docker compose up -d postgres redis`: quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base
`analytics_db`, su usuario `analytics_user` y el usuario de solo lectura `analytics_ro` ya creados. Para
que el ETL tenga datos, las bases de Fixture, Live Score y Statistics deben tener sus tablas (es decir,
esos servicios deben haber arrancado al menos una vez).

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-analytics-service.git
cd sportsleague-analytics-service
docker build -t sportsleague-analytics-service .
docker run --rm -p 4009:4009 \
  -e DATABASE_URL=postgresql://analytics_user:sl_dev_pass@host.docker.internal:5440/analytics_db \
  -e FIXTURE_REPLICA_URL=postgresql://analytics_ro:sl_ro_pass@host.docker.internal:5440/fixture_db \
  -e LIVESCORE_REPLICA_URL=postgresql://analytics_ro:sl_ro_pass@host.docker.internal:5440/livescore_db \
  -e STATISTICS_REPLICA_URL=postgresql://analytics_ro:sl_ro_pass@host.docker.internal:5440/statistics_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  sportsleague-analytics-service
curl http://localhost:4009/health
```

El contenedor ejecuta `npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal`
apunta al equipo anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`.
En PowerShell, cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440`, `localhost:6380` y a las tres réplicas con el usuario
`analytics_ro`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu PostgreSQL o tu Redis son otros
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4009/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo junto con las cabeceras de identidad que pondría el gateway:

```bash
curl -X POST http://localhost:4009/api/v1/analytics/etl/run \
  -H "x-internal-token: dev-internal-token-change-me" \
  -H "x-user-id: 00000000-0000-4000-8000-000000000001" -H "x-user-role: ADMIN" -H "x-user-email: admin@sportsleague.com"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL ni Redis: usan dobles en memoria y desactivan el ETL programado
(`ETL_DISABLED=true`). Cubren la resolución de las URL de las réplicas, las transformaciones (asistencia
con acta o pico en línea, suspendidos, KPIs, tendencia acumulada) y los permisos de las consultas.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio. *Rol* = solo esos roles (`@Roles`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/v1/analytics/overview` | Rol `ADMIN` | KPIs globales: partidos por estado, goles, tarjetas, promedio de goles, asistencia total y media, KPIs de cada liga y las últimas 10 corridas del ETL. |
| GET | `/api/v1/analytics/leagues/:leagueId` | Sesión (organizador de la liga o `ADMIN`) | KPI de la liga, asistencia estimada y partidos suspendidos, con la fecha del cálculo. |
| GET | `/api/v1/analytics/attendance?leagueId=` | Sesión (organizador de la liga o `ADMIN`) | Asistencia estimada de cada partido finalizado de la liga. |
| GET | `/api/v1/analytics/suspended-matches?leagueId=` | Sesión (organizador de la liga o `ADMIN`) | Partidos suspendidos de la liga con su motivo. |
| GET | `/api/v1/analytics/team-trend/:teamId` | Público | Tendencia de rendimiento del equipo partido a partido (`seasonId` opcional). |
| POST | `/api/v1/analytics/etl/run` | Rol `ADMIN` | Ejecuta el ETL en el momento y devuelve la corrida (o indica que ya hay una en curso). |
| GET | `/api/v1/analytics/etl/runs` | Rol `ADMIN` | Últimas 30 corridas del ETL. |
| GET | `/health` | Abierto | Salud del servicio (base de datos propia y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria y checks; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus, incluidas `etl_runs_total{status}` y `etl_duration_seconds`. |

En el gateway, `/api/v1/analytics/overview` y `/api/v1/analytics/etl/*` también están restringidas a
`ADMIN`.

## Eventos

No publica ni consume eventos.

## Comunicación con otros servicios

- **No hace llamadas REST** a otros microservicios y ninguno lo llama a él (solo el API Gateway).
- **Lee por SQL** (con `pg`) las réplicas de solo lectura de tres bases:

| Réplica | Variable | Qué lee |
|---|---|---|
| `fixture_db` | `FIXTURE_REPLICA_URL` | `matches` unida a `fixtures` (solo calendarios `PUBLISHED`) |
| `livescore_db` | `LIVESCORE_REPLICA_URL` | `live_matches` (estado, asistencia y pico de espectadores) y `match_events` (tipo y valor) |
| `statistics_db` | `STATISTICS_REPLICA_URL` | `match_results` (marcadores en orden cronológico) |

Si una réplica no está configurada, el ETL la omite y lo registra en el log (`replica_not_configured`).

## Base de datos

Base propia **`analytics_db`** en PostgreSQL 16 (usuario `analytics_user` en Docker Compose). Ningún otro
servicio puede conectarse a ella. Sus tablas se reescriben en cada corrida del ETL.

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `attendance_estimates` | `id` (UUID, PK), `match_id`, `league_id`, `season_id`, `category_id`, `owner_id`, `home_team_id`, `away_team_id`, `scheduled_at`, `estimated_attendance`, `source` (`REPORTED` u `ONLINE_PEAK`), `computed_at` | Único `attendance_estimates_match_id_key`; índice `attendance_estimates_league_id_idx` |
| `suspended_matches` | `id` (UUID, PK), `match_id`, `league_id`, `season_id`, `category_id`, `owner_id`, `home_team_id`, `away_team_id`, `reason`, `scheduled_at`, `computed_at` | Único `suspended_matches_match_id_key`; índice `suspended_matches_league_id_idx` |
| `team_performance_trend` | `id` (UUID, PK), `team_id`, `season_id`, `category_id`, `league_id`, `match_index`, `match_id`, `result`, `points_cumulative`, `goal_difference_cumulative`, `played_at` | Único `team_performance_trend_team_id_season_id_match_index_key`; índice `team_performance_trend_team_id_season_id_idx` |
| `league_kpis` | `league_id` (PK), `owner_id`, `total_matches`, `scheduled`, `live`, `finished`, `suspended`, `total_goals`, `total_cards`, `avg_goals_per_match`, `avg_attendance`, `computed_at` | — |
| `etl_runs` | `id` (UUID, PK), `trigger` (`startup`, `schedule` o `manual`), `status` (`RUNNING`, `SUCCESS` o `FAILED`), `started_at`, `finished_at`, `duration_ms`, `rows_processed`, `error` | Índice `etl_runs_started_at_idx` |

Las migraciones están en `prisma/migrations/` (`20261011000000_init`) y se aplican solas al arrancar con
`npx prisma migrate deploy`; Prisma registra las aplicadas en la tabla `_prisma_migrations`.

### Carpeta `database/`

| Archivo | Contenido | Generado con |
|---|---|---|
| `database/esquema.sql` | Solo el esquema (tablas, índices y llaves) | `pg_dump --schema-only` |
| `database/datos-ejemplo.sql` | Datos de la liga de demostración (resultado del ETL) | `pg_dump --data-only --column-inserts` |
| `database/respaldo.sql` | Respaldo completo (borra y recrea los objetos) | `pg_dump --clean --if-exists --no-owner --no-privileges` |

Restaurar el respaldo con el usuario del servicio (el de `DATABASE_URL`), para que las tablas queden a su
nombre:

```bash
psql "$DATABASE_URL" -f database/respaldo.sql
```

Generar un respaldo nuevo desde la pila de Docker (en la raíz del repositorio principal):

```bash
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges analytics_db > services/analytics-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4009` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a la base propia (Prisma). Docker Compose: `postgresql://analytics_user:sl_dev_pass@postgres:5432/analytics_db`. También se usa para completar las réplicas indicadas solo por nombre. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `analytics_db?connection_limit=5`). |
| `FIXTURE_REPLICA_URL` | Sí para el ETL | — | Réplica de solo lectura de `fixture_db`. URL completa (`postgresql://analytics_ro:…/fixture_db`) o solo el nombre de la base, que se busca en la misma instancia de `DATABASE_URL` (así lo usa Render Free). |
| `LIVESCORE_REPLICA_URL` | Sí para el ETL | — | Réplica de `livescore_db` (mismo formato). |
| `STATISTICS_REPLICA_URL` | Sí para el ETL | — | Réplica de `statistics_db` (mismo formato). |
| `ETL_INTERVAL_MINUTES` | No | `5` | Minutos entre corridas programadas (Docker Compose y `.env.example` usan `2`). |
| `ETL_INITIAL_DELAY_SECONDS` | No | `20` | Segundos de espera antes de la primera corrida tras arrancar. |
| `ETL_DISABLED` | No | `false` | `true` desactiva el ETL programado (sigue disponible `POST /api/v1/analytics/etl/run`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para el candado del ETL y las trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `analytics-service` | Nombre del servicio en logs y métricas. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId`. |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; este
servicio no las usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-analytics-service`, publicada por
  GitHub Actions desde el repositorio principal (`.github/workflows/analytics-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_ANALYTICS`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-analytics.onrender.com. Usa la
  PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y lee las bases
  de Fixture, Live Score y Statistics de la misma instancia por su nombre (`FIXTURE_REPLICA_URL=fixture_db`,
  etc.). En el plan gratuito todas las bases comparten usuario, así que allí no existe el usuario de solo
  lectura `analytics_ro`. Es un servicio web público, pero sin `x-internal-token` solo responde `/health` y
  `/metrics`.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. Mientras está
  dormido el ETL no corre. La PostgreSQL gratuita caduca a los 30 días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
