# Team Service · SportsLeague

Microservicio de equipos de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Registra los equipos de cada categoría y sus plantillas de jugadores, y
verifica automáticamente la elegibilidad de cada jugador según el rango de edad de la categoría, que
consulta al League Service.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4003 | `team_db` | [sportsleague-team-service](https://github.com/javierlydiaz21-bit/sportsleague-team-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Equipos** de una categoría (nombre único dentro de la categoría), con entrenador, correo de contacto,
  color del escudo (si no se indica, se genera uno estable a partir del nombre) y **cancha propia
  preferida** (`homeVenueId`), que el Fixture Service intenta respetar al programar los partidos de local.
- Solo el **organizador de la liga** (o el administrador) registra y modifica equipos; no se pueden
  registrar equipos si la liga está rechazada o suspendida, y la cancha propia debe ser de la misma liga.
- **Plantillas**: fichaje de jugadores uno a uno o en bloque (de 1 a 60, sin dorsales repetidos); el
  dorsal es único dentro del equipo.
- **Elegibilidad automática** al fichar o al cambiar la fecha de nacimiento: la edad cumplida (calculada
  en UTC a la fecha actual) debe estar dentro del rango de la categoría. Resultado: `ELIGIBLE`,
  `INELIGIBLE` (con el motivo, por ejemplo «Tiene 15 años; la categoría exige mínimo 16») o `PENDING`.
- **Revalidación** con `PUT /players/:id/eligibility`; el administrador puede además fijar el estado a
  mano tras revisar la documentación de fichaje.
- **Datos privados**: el documento de identidad y el enlace al documento de fichaje solo los ven el
  organizador de la liga y el administrador.
- **Resiliencia**: el rango de edad de cada categoría se guarda en caché en Redis durante 24 h. Si el
  League Service no responde se usa la caché; si tampoco hay caché, el jugador queda `PENDING` y se puede
  revalidar después.

**Qué no hace**

- No crea ligas, categorías ni canchas (League), no programa partidos (Fixture) y no guarda estadísticas
  de los jugadores (Statistics).
- No publica ni consume eventos: otros servicios le consultan los equipos y las plantillas por REST.

**Por qué es un servicio aparte**: las plantillas cambian con frecuencia durante la temporada y las
consultan el Fixture, el Live Score y el Notification Service. Separarlas evita que esa carga afecte a la
configuración de las ligas, y la regla de elegibilidad queda encapsulada en un solo lugar.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `team_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Caché del rango de edad, bus de eventos del chassis y trazas |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
team-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4003)
│   ├── app.module.ts         módulo raíz
│   ├── teams/
│   │   ├── teams.controller.ts, players.controller.ts
│   │   ├── teams.service.ts  lógica de equipos y jugadores
│   │   ├── eligibility.ts    cálculo de edad y elegibilidad (lógica pura)
│   │   └── dto.ts            validación de entradas
│   ├── clients/
│   │   └── league.client.ts  cliente REST del League Service (timeout, reintentos, caché)
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

El servicio escucha en el puerto **4003**. En las tres opciones la comprobación es
`GET http://localhost:4003/health`, que responde `200` con
`{"status":"ok","service":"team-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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
docker compose ps team-service                                    # estado "healthy"
docker compose exec team-service wget -qO- http://127.0.0.1:4003/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles, y el League Service para registrar equipos y validar la
elegibilidad. Lo más sencillo es levantar la infraestructura del repositorio principal con
`docker compose up -d postgres redis`: PostgreSQL y Redis quedan en `127.0.0.1:5440` y `127.0.0.1:6380`,
con la base `team_db` y su usuario `team_user` ya creados.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-team-service.git
cd sportsleague-team-service
docker build -t sportsleague-team-service .
docker run --rm -p 4003:4003 \
  -e DATABASE_URL=postgresql://team_user:sl_dev_pass@host.docker.internal:5440/team_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e LEAGUE_SERVICE_URL=http://host.docker.internal:4002 \
  sportsleague-team-service
curl http://localhost:4003/health
```

El contenedor ejecuta `npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal`
apunta al equipo anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`.
En PowerShell, cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440`, `localhost:6380` y al League Service en `localhost:4002`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu PostgreSQL o tu Redis son otros
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4003/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo (y, para las rutas con sesión, las cabeceras `x-user-id`,
`x-user-role`, `x-user-email` que pondría el gateway):

```bash
curl "http://localhost:4003/api/v1/teams?leagueId=<uuid-de-la-liga>" -H "x-internal-token: dev-internal-token-change-me"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL, Redis ni el League Service: usan dobles en memoria. Cubren el
cálculo de la edad (incluido el día del cumpleaños), los tres estados de elegibilidad, el caso de League
Service caído (jugador pendiente) y que solo el organizador de la liga registre equipos.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio (organizador de la liga o `ADMIN`). *Rol* = solo
esos roles (`@Roles`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/teams` | Rol `ORGANIZER` o `ADMIN` (organizador de la liga) | Registra un equipo (`categoryId`, `name`, `homeVenueId`, `coachName`, `contactEmail`, `color`). |
| GET | `/api/v1/teams` | Público | Equipos por `categoryId`, `leagueId` o `ids` (separados por comas); uno de los tres es obligatorio. Incluye el número de jugadores. |
| GET | `/api/v1/teams/:id` | Público | Equipo con su plantilla (datos privados solo para el organizador o `ADMIN`). |
| PATCH | `/api/v1/teams/:id` | Sesión (organizador o `ADMIN`) | Edita nombre, cancha propia, entrenador, correo o color. |
| DELETE | `/api/v1/teams/:id` | Sesión (organizador o `ADMIN`) | Elimina el equipo y, en cascada, sus jugadores. |
| POST | `/api/v1/teams/:id/players` | Sesión (organizador o `ADMIN`) | Ficha un jugador (`firstName`, `lastName`, `birthDate`, `jerseyNumber`, `position`, `documentId`, `registrationDocUrl`) y evalúa su elegibilidad. |
| POST | `/api/v1/teams/:id/players/bulk` | Sesión (organizador o `ADMIN`) | Ficha de 1 a 60 jugadores en una sola transacción (`players`). |
| GET | `/api/v1/teams/:id/players` | Público | Plantilla del equipo. |
| GET | `/api/v1/players` | Público | Jugadores por `ids` o `teamIds` (separados por comas), sin datos privados. |
| GET | `/api/v1/players/:id` | Público | Jugador con los datos básicos de su equipo. |
| PATCH | `/api/v1/players/:id` | Sesión (organizador o `ADMIN`) | Edita el jugador; si cambia `birthDate`, vuelve a evaluar la elegibilidad. |
| DELETE | `/api/v1/players/:id` | Sesión (organizador o `ADMIN`) | Elimina el jugador. |
| PUT | `/api/v1/players/:id/eligibility` | Sesión (organizador o `ADMIN`) | Revalida la elegibilidad. Con `status` (solo `ADMIN`) la fija a mano, con una `note` opcional. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos (incluido el del League Service) y suscripciones; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus (HTTP, llamadas al League Service y estado de su circuit breaker). |

La ruta `/api/v1/players/:id/disciplinary-record` no llega a este servicio: el gateway la envía al
Statistics Service.

## Eventos

No publica ni consume eventos.

## Comunicación con otros servicios

**Llamadas que hace** (REST síncrono con el `ServiceClient` del chassis): timeout por llamada, reintentos
con backoff exponencial (150 ms, 300 ms… con variación aleatoria; solo en lecturas) y circuit breaker
(se abre tras 5 fallos seguidos, rechaza durante 15 s y luego deja pasar una llamada de prueba). Un error
`4xx` del servicio llamado no cuenta como fallo.

| Destino | Llamada | Para qué | Timeout | Reintentos |
|---|---|---|---|---|
| League Service | `GET /api/v1/categories/:id` (con la identidad del usuario) | Comprobar que el usuario organiza la liga, el estado de la liga y el rango de edad de la categoría (que guarda en caché 24 h) | 2500 ms | 2 |
| League Service | `GET /api/v1/venues/:id` | Comprobar que la cancha propia del equipo pertenece a la liga | 2500 ms | 2 |

**Llamadas que recibe** de otros servicios:

| Quién llama | Llamada | Para qué |
|---|---|---|
| Fixture Service | `GET /api/v1/teams?categoryId=` | Equipos de la categoría y su cancha propia, para generar el calendario |
| Live Score Service | `GET /api/v1/players?teamIds=` | Plantillas de los dos equipos al iniciar un partido |
| Notification Service | `GET /api/v1/teams?ids=` | Nombres de los equipos para los avisos |

## Base de datos

Base propia **`team_db`** en PostgreSQL 16 (usuario `team_user` en Docker Compose). Ningún otro servicio
puede conectarse a ella. Tipo enumerado: `EligibilityStatus` (`ELIGIBLE`, `INELIGIBLE`, `PENDING`).

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `teams` | `id` (UUID, PK), `name`, `league_id`, `category_id`, `owner_id`, `home_venue_id`, `coach_name`, `contact_email`, `color`, `created_at`, `updated_at` | Único `teams_category_id_name_key` (`category_id`, `name`); índices `teams_category_id_idx` y `teams_league_id_idx`. `league_id`, `category_id` y `home_venue_id` son referencias lógicas al League Service, sin llave foránea entre bases |
| `players` | `id` (UUID, PK), `team_id`, `first_name`, `last_name`, `document_id`, `birth_date` (`DATE`), `jersey_number`, `position`, `eligibility_status` (por defecto `PENDING`), `eligibility_note`, `registration_doc_url`, `created_at`, `updated_at` | Único `players_team_id_jersey_number_key` (`team_id`, `jersey_number`); índice `players_team_id_idx`; FK `team_id` → `teams.id` con `ON DELETE CASCADE` |

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
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges team_db > services/team-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4003` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://team_user:sl_dev_pass@postgres:5432/team_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `team_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para la caché, eventos y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios; también se envía en las llamadas al League Service. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `LEAGUE_SERVICE_URL` | No | `http://localhost:4002` | URL del League Service (acepta `http://host:puerto` o solo `host:puerto`). Docker Compose: `http://league-service:4002`; Render: `https://sportsleague-jd-league.onrender.com`. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `team-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId`. |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; este
servicio no las usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-team-service`, publicada por GitHub
  Actions desde el repositorio principal (`.github/workflows/team-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_TEAM`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-team.onrender.com. Usa la
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
