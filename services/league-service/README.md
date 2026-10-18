# League Service · SportsLeague

Microservicio de ligas de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Gestiona las ligas y su aprobación por parte del administrador, las
temporadas, las categorías con su rango de edad, el reglamento de puntuación y desempates de cada
categoría y las canchas con su disponibilidad.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4002 | `league_db` | [sportsleague-league-service](https://github.com/javierlydiaz21-bit/sportsleague-league-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Ligas** de fútbol (`FOOTBALL`), básquet (`BASKETBALL`) o vóley (`VOLLEYBALL`). Una liga nace
  `PENDING` y el administrador la revisa. Transiciones permitidas: `PENDING` → `APPROVED` o `REJECTED`;
  `APPROVED` → `SUSPENDED`; `REJECTED` o `SUSPENDED` → `APPROVED`.
- **Visibilidad**: solo las ligas `APPROVED` son públicas; el organizador ve las suyas en cualquier estado
  y el administrador ve todas. Una liga aprobada solo la puede eliminar el administrador.
- **Temporadas** con nombre, año y fechas (la de inicio debe ser anterior a la de fin).
- **Categorías** con nombre único dentro de la liga y edad mínima y máxima (el `age_range` del documento
  de arquitectura). El Team Service usa ese rango para la elegibilidad de los jugadores.
- **Reglamento** por categoría: puntos por victoria, empate y derrota y criterios de desempate
  (`GOAL_DIFFERENCE`, `GOALS_FOR`, `GOALS_AGAINST`, `HEAD_TO_HEAD`, `WINS`). Si no se indica, se aplica
  el del deporte: fútbol 3/1/0; básquet 2/0/1 (FIBA, sin empates); vóley 3/0/0.
- **Canchas** con zona geográfica, días disponibles (0 = domingo … 6 = sábado) y horario de apertura y
  cierre (`HH:MM`). Las usan el Fixture Service para programar y el Referee Service para priorizar
  árbitros de la misma zona.
- **Estructura de la temporada** para el Fixture Service (liga, categorías y canchas en una sola
  respuesta, por una ruta interna).
- Solo el organizador dueño de la liga (o el administrador) modifica la liga y todo lo que cuelga de ella.

**Qué no hace**

- No genera calendarios (Fixture), no registra equipos ni jugadores (Team) y no calcula la tabla de
  posiciones (Statistics: solo le sirve el reglamento).
- No gestiona cuentas: guarda el `owner_id` y el `owner_name` que llegan en la identidad propagada por
  el API Gateway.

**Por qué es un servicio aparte**: League es la fuente de verdad de la configuración de la competición.
Team, Fixture y Statistics la leen, pero solo League la modifica; así puede evolucionar a su ritmo, y si
cae no se bloquean los partidos en curso (Live Score no depende de League).

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `league_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub) y trazas |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
league-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4002)
│   ├── app.module.ts         módulo raíz
│   ├── leagues/
│   │   ├── leagues.controller.ts, seasons.controller.ts, categories.controller.ts, venues.controller.ts
│   │   ├── internal.controller.ts   ruta interna para el Fixture Service
│   │   ├── leagues.service.ts       lógica de negocio y publicación de eventos
│   │   ├── rules.ts                 reglamentos por defecto, transiciones de revisión, horas y fechas
│   │   └── dto.ts                   validación de entradas
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

El servicio escucha en el puerto **4002**. En las tres opciones la comprobación es
`GET http://localhost:4002/health`, que responde `200` con
`{"status":"ok","service":"league-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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
docker compose ps league-service                                  # estado "healthy"
docker compose exec league-service wget -qO- http://127.0.0.1:4002/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles. Lo más sencillo es levantar los del repositorio principal con
`docker compose up -d postgres redis`: quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base
`league_db` y su usuario `league_user` ya creados.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-league-service.git
cd sportsleague-league-service
docker build -t sportsleague-league-service .
docker run --rm -p 4002:4002 \
  -e DATABASE_URL=postgresql://league_user:sl_dev_pass@host.docker.internal:5440/league_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  sportsleague-league-service
curl http://localhost:4002/health
```

El contenedor ejecuta `npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal`
apunta al equipo anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`.
En PowerShell, cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440` y `localhost:6380`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu PostgreSQL o tu Redis son otros
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4002/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo (y, para las rutas con sesión, las cabeceras `x-user-id`,
`x-user-role`, `x-user-email` que pondría el gateway):

```bash
curl http://localhost:4002/api/v1/leagues -H "x-internal-token: dev-internal-token-change-me"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL ni Redis: sustituyen Prisma, Redis y el bus de eventos por dobles en
memoria. Cubren el ciclo de aprobación de ligas, la visibilidad de las ligas pendientes, los reglamentos
por defecto, la validación de edades, fechas y horas, y los permisos del organizador.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio (dueño de la liga o `ADMIN`). *Rol* = solo esos
roles (`@Roles`). *Interno* = solo entre servicios (el gateway responde `404` a `/api/v1/internal/*`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/leagues` | Rol `ORGANIZER` o `ADMIN` | Crea una liga (`name`, `sport`, `description`, `city`); queda `PENDING`. Publica `league.created`. |
| GET | `/api/v1/leagues` | Público | Ligas aprobadas con filtros `q`, `sport`, `ids` (separados por comas) y `limit`. Solo `ADMIN` puede filtrar por otro `status`. |
| GET | `/api/v1/leagues/mine` | Sesión | Ligas del usuario, en cualquier estado. |
| GET | `/api/v1/leagues/stats` | Rol `ADMIN` | Número de ligas por estado. |
| GET | `/api/v1/leagues/:id` | Público | Detalle con temporadas, categorías (con reglamento) y canchas. Si no está aprobada, solo la ven su organizador o `ADMIN`. |
| PATCH | `/api/v1/leagues/:id` | Sesión (dueño o `ADMIN`) | Edita nombre, descripción o ciudad. |
| DELETE | `/api/v1/leagues/:id` | Sesión (dueño o `ADMIN`) | Elimina la liga y, en cascada, sus temporadas, categorías y canchas. Una liga aprobada solo la elimina `ADMIN`. |
| PATCH | `/api/v1/leagues/:id/review` | Rol `ADMIN` | Aprueba, rechaza o suspende (`status`, `note`). Publica `league.reviewed`. |
| POST | `/api/v1/leagues/:id/seasons` | Sesión (dueño o `ADMIN`) | Crea una temporada (`name`, `year`, `startDate`, `endDate`). |
| POST | `/api/v1/leagues/:id/categories` | Sesión (dueño o `ADMIN`) | Crea una categoría (`name`, `minAge`, `maxAge`, `rules` opcional). |
| POST | `/api/v1/leagues/:id/venues` | Sesión (dueño o `ADMIN`) | Crea una cancha (`name`, `address`, `zone`, `availableDays`, `openTime`, `closeTime`). |
| GET | `/api/v1/seasons/:id` | Público | Temporada con su liga y las categorías de la liga (mismas reglas de visibilidad). |
| PATCH | `/api/v1/seasons/:id` | Sesión (dueño o `ADMIN`) | Edita el nombre o las fechas. |
| POST | `/api/v1/seasons/:id/categories` | Sesión (dueño o `ADMIN`) | Crea la categoría en la liga de la temporada (ruta del documento de arquitectura). |
| GET | `/api/v1/categories/:id` | Público | Categoría con su reglamento y datos básicos de la liga. |
| PATCH | `/api/v1/categories/:id` | Sesión (dueño o `ADMIN`) | Edita el nombre o el rango de edad. |
| GET | `/api/v1/categories/:id/rules` | Público | Reglamento vigente (o el del deporte si no tiene uno propio). Lo consulta el Statistics Service. |
| PUT | `/api/v1/categories/:id/rules` | Sesión (dueño o `ADMIN`) | Reemplaza el reglamento (`pointsWin`, `pointsDraw`, `pointsLoss`, `tiebreakerCriteria`). Publica `rules.updated`. |
| GET | `/api/v1/venues/:id` | Público | Cancha con datos básicos de su liga. |
| PATCH | `/api/v1/venues/:id` | Sesión (dueño o `ADMIN`) | Edita la cancha. |
| DELETE | `/api/v1/venues/:id` | Sesión (dueño o `ADMIN`) | Elimina la cancha. |
| GET | `/api/v1/internal/seasons/:id/structure` | Interno | Temporada, liga, categorías y canchas en una respuesta, para el Fixture Service. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos y suscripciones; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus (HTTP, eventos publicados). |

En el gateway, `PATCH /api/v1/leagues/:id/review` y `GET /api/v1/leagues/stats` también están
restringidas a `ADMIN`. Las rutas `/api/v1/seasons/:id/fixtures/*` no llegan a este servicio: el gateway
las envía al Fixture Service.

### Ejemplo: de la liga a la categoría por el API Gateway

Recorrido con la pila local (`docker compose up -d`) y la cuenta `organizador@demo.com`. Cada
respuesta devuelve el `id` que usa la petición siguiente.

```bash
API=http://localhost:4000/api/v1

# 1. Iniciar sesión ("client":"mobile" devuelve el token en el cuerpo de la respuesta)
curl -s -X POST $API/auth/login -H 'content-type: application/json' \
  -d '{"email":"organizador@demo.com","password":"Demo12345","client":"mobile"}'
TOKEN=<accessToken de la respuesta>

# 2. Crear la liga: nace en estado PENDING hasta que el administrador la apruebe
curl -s -X POST $API/leagues -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Liga Universitaria","sport":"FOOTBALL","city":"Montería"}'

# 3. Temporada (la fecha de inicio debe ser anterior a la de fin)
curl -s -X POST $API/leagues/<id de la liga>/seasons -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Apertura 2026","year":2026,"startDate":"2026-11-01","endDate":"2026-12-15"}'

# 4. Categoría con rango de edad, creada desde la temporada (ruta del documento de arquitectura)
curl -s -X POST $API/seasons/<id de la temporada>/categories -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"name":"Sub-20","minAge":16,"maxAge":20}'

# 5. Reglamento por defecto del fútbol (público): 3 puntos por victoria, 1 por empate, 0 por derrota
curl -s $API/categories/<id de la categoría>/rules
```

Errores habituales: `400` si los datos no son válidos (por ejemplo, «La edad mínima no puede ser
mayor que la edad máxima»), `401` sin token y `403` si la liga pertenece a otro organizador.

## Eventos

Se publican en **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre JSON
(`id`, `type`, `version`, `source`, `occurredAt`, `requestId`, `data`). Cada evento publicado también se
guarda en la lista `events:recent` (últimos 200) que muestra el panel de administración.

**Publica**

| Evento (canal) | Cuándo | Datos (`data`) | Quién lo consume |
|---|---|---|---|
| `league.created` | Al crear una liga | `leagueId`, `name`, `sport`, `ownerId`, `ownerName` | Notification Service: avisa a los administradores de que hay una liga pendiente |
| `league.reviewed` | Al aprobar, rechazar o suspender una liga | `leagueId`, `name`, `ownerId`, `status`, `note`, `reviewedBy` | Notification Service: avisa al organizador |
| `rules.updated` | Al reemplazar el reglamento de una categoría | `categoryId`, `leagueId` | Statistics Service: recalcula la tabla de esa categoría en todas sus temporadas |

**Consume**: ningún evento.

## Comunicación con otros servicios

- **No hace llamadas REST** a otros microservicios.
- **Recibe** (todas con el `ServiceClient` del chassis de cada servicio que llama):

| Quién llama | Llamada | Para qué |
|---|---|---|
| Team Service | `GET /api/v1/categories/:id` (con la identidad del usuario) | Comprobar que el usuario organiza la liga, el estado de la liga y el rango de edad |
| Team Service | `GET /api/v1/venues/:id` | Comprobar que la cancha propia del equipo es de la liga |
| Fixture Service | `GET /api/v1/internal/seasons/:id/structure` | Generar, publicar y reprogramar el calendario |
| Statistics Service | `GET /api/v1/categories/:id/rules` | Puntos y desempates para la tabla |
| Statistics Service | `GET /api/v1/seasons/:id` (con la identidad del usuario) | Comprobar quién puede pedir un recálculo manual |

## Base de datos

Base propia **`league_db`** en PostgreSQL 16 (usuario `league_user` en Docker Compose). Ningún otro
servicio puede conectarse a ella. Tipos enumerados: `Sport` (`FOOTBALL`, `BASKETBALL`, `VOLLEYBALL`) y
`LeagueStatus` (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`).

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `leagues` | `id` (UUID, PK), `name`, `sport`, `description`, `city`, `owner_id`, `owner_name`, `status` (por defecto `PENDING`), `review_note`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at` | Índices `leagues_owner_id_idx` y `leagues_status_idx` |
| `seasons` | `id` (UUID, PK), `league_id`, `name`, `year`, `start_date` y `end_date` (`DATE`), `created_at` | Índice `seasons_league_id_idx`; FK `league_id` → `leagues.id` con `ON DELETE CASCADE` |
| `categories` | `id` (UUID, PK), `league_id`, `name`, `min_age`, `max_age`, `created_at` | Único `categories_league_id_name_key` (`league_id`, `name`); índice `categories_league_id_idx`; FK a `leagues` en cascada |
| `rules` | `id` (UUID, PK), `category_id`, `points_win` (3), `points_draw` (1), `points_loss` (0), `tiebreaker_criteria` (`text[]`), `updated_at` | Único `rules_category_id_key` (un reglamento por categoría); FK a `categories` en cascada |
| `venues` | `id` (UUID, PK), `league_id`, `name`, `address`, `zone`, `available_days` (`int[]`), `open_time`, `close_time`, `created_at` | Índice `venues_league_id_idx`; FK a `leagues` en cascada |

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
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges league_db > services/league-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4002` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://league_user:sl_dev_pass@postgres:5432/league_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `league_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `league-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId`. |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; este
servicio no las usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-league-service`, publicada por GitHub
  Actions desde el repositorio principal (`.github/workflows/league-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_LEAGUE`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-league.onrender.com. Usa la
  PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y el Key Value
  `sportsleague-jd-redis`. Es un servicio web público, pero sin `x-internal-token` solo responde `/health`
  y `/metrics`.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. La PostgreSQL
  gratuita caduca a los 30 días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
