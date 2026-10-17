# Fixture Service · SportsLeague

Microservicio de calendario de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Genera automáticamente el calendario «todos contra todos» de una categoría
respetando la disponibilidad de las canchas, el descanso mínimo entre partidos y el equilibrio de
localía; gestiona partidos manuales, reprogramaciones y suspensiones, y publica cada jornada con el
evento `fixture.published` para que el resto de la plataforma reaccione.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4004 | `fixture_db` | [sportsleague-fixture-service](https://github.com/javierlydiaz21-bit/sportsleague-fixture-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Genera el borrador** (`DRAFT`) del calendario de una categoría en una temporada:
  - jornadas por el método del círculo (tablas de Berger): cada equipo juega una vez por jornada y la
    localía queda equilibrada (la diferencia local/visitante de cada equipo es como máximo 1); ida o ida
    y vuelta (`doubleRound`) y orden aleatorio opcional (`shuffle`);
  - fecha, cancha y hora de cada partido según los días de juego (`matchDays`, 0 = domingo … 6 = sábado;
    por defecto, los días disponibles de las canchas), la duración de la franja (`slotMinutes`, de 30 a
    300, por defecto 120), el **descanso mínimo** entre partidos de un mismo equipo (`minRestDays`, de 0 a
    30, por defecto 3), el horario de cada cancha y la **cancha propia** preferida del equipo local;
  - la hora local de la liga se convierte a UTC con `LEAGUE_UTC_OFFSET`.
- Avisa (`warnings`) si el calendario termina después del cierre de la temporada y responde `422` si no
  es posible programarlo (por ejemplo, sin canchas o sin horario suficiente).
- Solo genera para **ligas aprobadas**, a petición de su organizador (o del administrador) y con al menos
  2 equipos. Regenerar reemplaza el borrador; un calendario publicado no se regenera ni se descarta.
- **Publica** el calendario: pasa a `PUBLISHED` y emite `fixture.published` **una vez por jornada**.
- **Partidos manuales** (si la categoría no tiene calendario, crea uno ya publicado), **reprogramación**
  de cancha u horario de partidos que no han empezado y **suspensión** con motivo.
- Mantiene el **estado del partido** (`SCHEDULED` → `LIVE` → `FINISHED`, o `SUSPENDED`) a partir de los
  eventos del Live Score Service.

**Qué no hace**

- No registra goles ni resultados (Live Score), no asigna árbitros (Referee), no calcula la tabla
  (Statistics) y no envía avisos (Notification): todos ellos reaccionan a sus eventos.
- No copia datos de otros servicios: guarda solo los ids de equipos y canchas (los nombres se consultan a
  Team y League cuando hacen falta).

**Por qué es un servicio aparte**: generar el calendario es un cálculo pesado y puntual que no debe
afectar a la operación en vivo. Publicar un evento por jornada desacopla a Referee, Statistics y
Notification: Fixture no necesita saber qué hace cada uno con el calendario.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `fixture_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub) y trazas por partido |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
fixture-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4004)
│   ├── app.module.ts         módulo raíz
│   ├── fixtures/
│   │   ├── fixtures.controller.ts
│   │   ├── fixtures.service.ts   generación, publicación, partidos manuales y consumidores de eventos
│   │   ├── scheduler.ts          motor del calendario: round-robin y asignación de fecha, cancha y hora
│   │   ├── events.ts             contratos de los eventos que publica y consume
│   │   └── dto.ts                validación de entradas
│   ├── clients/
│   │   └── clients.ts        clientes REST del League y del Team Service
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

El servicio escucha en el puerto **4004**. En las tres opciones la comprobación es
`GET http://localhost:4004/health`, que responde `200` con
`{"status":"ok","service":"fixture-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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
docker compose ps fixture-service                                 # estado "healthy"
docker compose exec fixture-service wget -qO- http://127.0.0.1:4004/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles, y el League y el Team Service para generar calendarios. Lo más
sencillo es levantar la infraestructura del repositorio principal con `docker compose up -d postgres redis`:
PostgreSQL y Redis quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base `fixture_db` y su usuario
`fixture_user` ya creados.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-fixture-service.git
cd sportsleague-fixture-service
docker build -t sportsleague-fixture-service .
docker run --rm -p 4004:4004 \
  -e DATABASE_URL=postgresql://fixture_user:sl_dev_pass@host.docker.internal:5440/fixture_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e LEAGUE_SERVICE_URL=http://host.docker.internal:4002 \
  -e TEAM_SERVICE_URL=http://host.docker.internal:4003 \
  sportsleague-fixture-service
curl http://localhost:4004/health
```

El contenedor ejecuta `npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal`
apunta al equipo anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`.
En PowerShell, cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440`, `localhost:6380` y a League y Team en `localhost:4002` y
`localhost:4003`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu PostgreSQL o tu Redis son otros
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4004/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo (y, para las rutas con sesión, las cabeceras `x-user-id`,
`x-user-role`, `x-user-email` que pondría el gateway):

```bash
curl "http://localhost:4004/api/v1/matches?status=SCHEDULED" -H "x-internal-token: dev-internal-token-change-me"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL, Redis ni los otros servicios: usan dobles en memoria. Cubren las
propiedades del round-robin (con 2 a 10 equipos todos se enfrentan exactamente una vez, nadie juega dos
veces en la misma jornada, la localía queda equilibrada y en ida y vuelta cada cruce se juega una vez
con cada equipo de local), el motor del calendario (días de juego, descanso mínimo, sin repetir cancha y hora, cancha propia, falta de
capacidad), las reglas de negocio (liga aprobada, organizador, mínimo de equipos, calendario publicado) y
la actualización idempotente del estado con `match.completed`.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio (organizador de la liga o `ADMIN`). *Rol* = solo
esos roles (`@Roles`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/seasons/:seasonId/fixtures/generate` | Rol `ORGANIZER` o `ADMIN` (organizador de la liga) | Genera o regenera el borrador de una categoría. Cuerpo: `categoryId` y, opcionales, `startDate`, `matchDays`, `slotMinutes`, `minRestDays`, `doubleRound`, `venueIds`, `shuffle`. Devuelve el calendario con `warnings` y `lastDate`. |
| GET | `/api/v1/seasons/:seasonId/fixtures` | Público | Calendarios de la temporada (filtro `categoryId`). Los borradores solo los ven su organizador o `ADMIN`. |
| GET | `/api/v1/fixtures/:id` | Público | Un calendario con sus partidos. Si el id es el de una temporada, devuelve los calendarios de esa temporada (ruta del documento de arquitectura). |
| POST | `/api/v1/fixtures/:id/publish` | Sesión (organizador o `ADMIN`) | Publica el borrador y emite `fixture.published` por cada jornada. |
| DELETE | `/api/v1/fixtures/:id` | Sesión (organizador o `ADMIN`) | Descarta un borrador (un calendario publicado no se puede descartar). |
| GET | `/api/v1/matches` | Público | Partidos de calendarios publicados. Filtros: `leagueId`, `seasonId`, `categoryId`, `teamId`, `status` (lista separada por comas), `from`, `to`, `ids`, `order` (`asc`/`desc`) y `limit`. |
| POST | `/api/v1/matches` | Rol `ORGANIZER` o `ADMIN` (organizador de la liga) | Crea un partido manual (`seasonId`, `categoryId`, `homeTeamId`, `awayTeamId`, `venueId`, `scheduledAt`, `round`). Si el calendario está publicado, emite `fixture.published` con ese partido. |
| GET | `/api/v1/matches/:id` | Público | Detalle del partido con `fixtureStatus`. Si el calendario es un borrador, solo lo ven su organizador o `ADMIN`. |
| PUT | `/api/v1/matches/:id/venue` | Sesión (organizador o `ADMIN`) | Reprograma la cancha (`venueId`) o el horario (`scheduledAt`) de un partido programado o suspendido; vuelve a `SCHEDULED`. Si el calendario está publicado, emite `match.rescheduled`. |
| PATCH | `/api/v1/matches/:id/status` | Sesión (organizador o `ADMIN`) | Suspende un partido programado o en curso (`status: "SUSPENDED"`, `reason`). Emite `match.suspended`. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos (League y Team) y suscripciones; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus, incluidas `fixtures_generated_total` y `fixture_generation_duration_seconds`. |

En el gateway, las rutas `/api/v1/matches/:id/events`, `/live`, `/start` y `/complete` van al Live Score
Service; el resto de `/api/v1/matches/*`, `/api/v1/fixtures/*` y `/api/v1/seasons/:id/fixtures/*` llega a
este servicio.

## Eventos

Se publican en **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre JSON
(`id`, `type`, `version`, `source`, `occurredAt`, `requestId`, `data`). Cada evento publicado también se
guarda en la lista `events:recent` (últimos 200) que muestra el panel de administración.

**Publica**

| Evento (canal) | Cuándo | Datos (`data`) | Quién lo consume |
|---|---|---|---|
| `fixture.published` | Al publicar un calendario (un evento por jornada) o al crear un partido manual en un calendario publicado | `fixtureId`, `leagueId`, `leagueName`, `seasonId`, `categoryId`, `categoryName`, `ownerId`, `round`, `totalRounds`, `matches[]` (`matchId`, ids y nombres de los equipos, `venueId`, `venueName`, `venueZone`, `scheduledAt`) | Referee (asigna árbitros), Statistics (incluye los equipos en la tabla), Notification (avisa al organizador y a los seguidores) |
| `match.rescheduled` | Al cambiar la cancha o el horario de un partido de un calendario publicado | `matchId`, `leagueId`, `leagueName`, `seasonId`, `categoryId`, `ownerId`, ids y nombres de los equipos, `scheduledAt`, `previousScheduledAt`, `venueId`, `venueName`, `venueZone`, `previousVenueName` | Referee (conserva o reasigna el árbitro), Notification |
| `match.suspended` | Al suspender un partido | `matchId`, `leagueId`, `seasonId`, `categoryId`, `ownerId`, `homeTeamId`, `awayTeamId`, `reason`, `previousStatus` | Referee, Live Score (detiene el acta en vivo), Notification |

**Consume**

| Evento (canal) | Lo publica | Qué hace |
|---|---|---|
| `match.started` | Live Score | Pasa el partido de `SCHEDULED` a `LIVE` (idempotente: solo si seguía programado). |
| `match.completed` | Live Score | Pasa el partido de `SCHEDULED` o `LIVE` a `FINISHED` (idempotente; las correcciones del acta no lo cambian otra vez). |

## Comunicación con otros servicios

**Llamadas que hace** (REST síncrono con el `ServiceClient` del chassis): timeout por llamada, reintentos
con backoff exponencial (150 ms, 300 ms… con variación aleatoria; solo en lecturas) y circuit breaker
(se abre tras 5 fallos seguidos, rechaza durante 15 s y luego deja pasar una llamada de prueba). Un error
`4xx` del servicio llamado no cuenta como fallo.

| Destino | Llamada | Para qué | Timeout | Reintentos |
|---|---|---|---|---|
| League Service | `GET /api/v1/internal/seasons/:id/structure` | Liga (estado y organizador), fechas de la temporada, categorías y canchas con su disponibilidad; se usa al generar, publicar, crear y reprogramar | 3000 ms | 2 |
| Team Service | `GET /api/v1/teams?categoryId=` | Equipos de la categoría, su nombre y su cancha propia | 3000 ms | 2 |

**Llamadas que recibe**: el Live Score Service consulta `GET /api/v1/matches/:id` (con la identidad del
usuario) al iniciar un partido. El Analytics Service lee las tablas `fixtures` y `matches` con su usuario
de solo lectura `analytics_ro`.

## Base de datos

Base propia **`fixture_db`** en PostgreSQL 16 (usuario `fixture_user` en Docker Compose). Ningún otro
servicio puede escribir en ella; el usuario `analytics_ro` solo tiene permiso de lectura (`SELECT`) para
el ETL del Analytics Service. Tipos enumerados: `FixtureStatus` (`DRAFT`, `PUBLISHED`) y `MatchStatus`
(`SCHEDULED`, `LIVE`, `FINISHED`, `SUSPENDED`).

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `fixtures` | `id` (UUID, PK), `season_id`, `category_id`, `league_id`, `owner_id`, `status` (por defecto `DRAFT`), `double_round`, `total_rounds`, `config` (JSON con los parámetros de generación), `created_at`, `published_at` | Único `fixtures_season_id_category_id_key` (`season_id`, `category_id`): un calendario por categoría y temporada |
| `matches` | `id` (UUID, PK), `fixture_id`, `season_id`, `category_id`, `league_id`, `owner_id`, `round`, `home_team_id`, `away_team_id`, `venue_id`, `scheduled_at`, `status` (por defecto `SCHEDULED`), `suspension_reason`, `created_at`, `updated_at` | Índices `matches_season_id_scheduled_at_idx` (consultas de calendario por fecha), `matches_status_idx`, `matches_category_id_idx` y `matches_league_id_idx`; FK `fixture_id` → `fixtures.id` con `ON DELETE CASCADE` |

Equipos, canchas, temporadas y ligas son referencias por id a otros servicios, sin llaves foráneas entre
bases.

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
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges fixture_db > services/fixture-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4004` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://fixture_user:sl_dev_pass@postgres:5432/fixture_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `fixture_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios; también se envía en las llamadas a League y Team. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `LEAGUE_SERVICE_URL` | No | `http://localhost:4002` | URL del League Service (acepta `http://host:puerto` o solo `host:puerto`). Docker Compose: `http://league-service:4002`. |
| `TEAM_SERVICE_URL` | No | `http://localhost:4003` | URL del Team Service. Docker Compose: `http://team-service:4003`. |
| `LEAGUE_UTC_OFFSET` | No | `-05:00` | Diferencia horaria de la liga respecto a UTC, para convertir a UTC la fecha y hora local de cada partido generado. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `fixture-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId` (trazabilidad por partido). |

`.env.example` también incluye `LEAGUE_TIMEZONE`, común a la plataforma; este servicio no la usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-fixture-service`, publicada por GitHub
  Actions desde el repositorio principal (`.github/workflows/fixture-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_FIXTURE`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-fixture.onrender.com. Usa la
  PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y el Key Value
  `sportsleague-jd-redis`; llama a League y Team por sus URL públicas. Es un servicio web público, pero sin
  `x-internal-token` solo responde `/health` y `/metrics`.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. Un servicio
  dormido no recibe los eventos de Redis. La PostgreSQL gratuita caduca a los 30 días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
