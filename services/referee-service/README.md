# Referee Service · SportsLeague

Microservicio de árbitros de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Registra los árbitros de cada organizador con su zona, sus categorías
certificadas y su disponibilidad semanal, y les asigna partidos automáticamente cada vez que se publica
una jornada (evento `fixture.published`); el árbitro confirma o rechaza y, si rechaza, se busca un
reemplazo.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4005 | `referee_db` | [sportsleague-referee-service](https://github.com/javierlydiaz21-bit/sportsleague-referee-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Árbitros** de cada organizador (el correo es único por organizador), con teléfono, zona geográfica,
  liga opcional (si no se indica, sirve para todas las ligas del organizador), categorías certificadas
  (vacío = todas) y ventanas de disponibilidad por día de la semana.
- **Enlace por correo con la cuenta**: un usuario con rol `REFEREE` y el mismo correo ve sus perfiles y
  sus partidos asignados, puede declarar su disponibilidad y confirmar o rechazar asignaciones.
- **Proyección local** de los partidos publicados (`scheduled_matches`), construida con
  `fixture.published` y actualizada con `match.rescheduled`, `match.suspended` y `match.completed`.
- **Asignación automática** (idempotente: si el evento llega dos veces no duplica la asignación). Un
  árbitro es candidato si está activo, pertenece al organizador de la liga, sirve para esa liga, está
  certificado en la categoría, está disponible ese día durante toda la duración del partido
  (`REFEREE_MATCH_MINUTES`, en hora local según `LEAGUE_UTC_OFFSET`), no tiene otro partido que se cruce y
  no rechazó ese partido. Entre los candidatos prioriza la **misma zona** de la cancha y después la
  **menor carga** de partidos (reparto equitativo).
- **Reprogramaciones**: si el árbitro asignado sigue disponible en el nuevo horario conserva el partido;
  si no, se busca otro.
- **Asignación manual**, reasignación automática de los partidos futuros sin árbitro de una liga,
  confirmación o rechazo (al rechazar se busca reemplazo) y eliminación de asignaciones.
- **Verificación interna** para el Live Score Service: ¿el árbitro con este correo tiene asignado este
  partido? Así solo el árbitro asignado puede registrar eventos.

**Qué no hace**

- No crea partidos ni cambia horarios (Fixture), no registra eventos del partido (Live Score), no envía
  avisos (publica eventos para el Notification Service) y no gestiona cuentas (Auth).

**Por qué es un servicio aparte**: la asignación es una regla de negocio con datos propios
(disponibilidad, zonas, certificaciones) que ningún otro servicio necesita. Al reaccionar por eventos, la
publicación del calendario no espera a que se asignen los árbitros y un fallo aquí no la bloquea.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `referee_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub) y trazas por partido |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
referee-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4005)
│   ├── app.module.ts         módulo raíz
│   ├── assignments/
│   │   ├── referees.controller.ts   rutas de árbitros, asignaciones y la ruta interna
│   │   ├── referees.service.ts      lógica de negocio y consumidores de eventos
│   │   ├── matching.ts              selección del árbitro (lógica pura, sin base de datos)
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

El servicio escucha en el puerto **4005**. En las tres opciones la comprobación es
`GET http://localhost:4005/health`, que responde `200` con
`{"status":"ok","service":"referee-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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
docker compose ps referee-service                                 # estado "healthy"
docker compose exec referee-service wget -qO- http://127.0.0.1:4005/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles. Lo más sencillo es levantar los del repositorio principal con
`docker compose up -d postgres redis`: quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base
`referee_db` y su usuario `referee_user` ya creados. Las asignaciones automáticas llegan por Redis cuando
el Fixture Service publica una jornada.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-referee-service.git
cd sportsleague-referee-service
docker build -t sportsleague-referee-service .
docker run --rm -p 4005:4005 \
  -e DATABASE_URL=postgresql://referee_user:sl_dev_pass@host.docker.internal:5440/referee_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  sportsleague-referee-service
curl http://localhost:4005/health
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
curl http://localhost:4005/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo (y, para las rutas con sesión, las cabeceras `x-user-id`,
`x-user-role`, `x-user-email` que pondría el gateway):

```bash
curl "http://localhost:4005/api/v1/internal/assignments/check?matchId=<uuid-del-partido>&email=arbitro@demo.com" \
  -H "x-internal-token: dev-internal-token-change-me"
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL ni Redis: usan dobles en memoria. Cubren la conversión a la hora
local de la liga, la prioridad por zona, los descartes (sin disponibilidad, de otra liga, no certificado
o inactivo), los cruces de horario y el reparto de carga, la exclusión de quien rechazó, la asignación
automática con `fixture.published`, su idempotencia y el aviso `referee.unassigned`.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio. *Rol* = solo esos roles (`@Roles`). *Interno* =
solo entre servicios (el gateway responde `404` a `/api/v1/internal/*`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/referees` | Rol `ORGANIZER` o `ADMIN` | Registra un árbitro (`name`, `email`, `phone`, `zone`, `leagueId`, `categoriesCertified`, `availability[]` con `dayOfWeek`, `startTime`, `endTime`). |
| GET | `/api/v1/referees` | Rol `ORGANIZER` o `ADMIN` | Árbitros del organizador (`ADMIN`: todos), con disponibilidad y número de asignaciones activas; filtro `leagueId`. |
| GET | `/api/v1/referees/me` | Sesión | Perfiles de árbitro enlazados al correo del usuario. |
| PATCH | `/api/v1/referees/:id` | Sesión (organizador que lo registró o `ADMIN`) | Edita nombre, teléfono, zona, categorías o `active`. |
| DELETE | `/api/v1/referees/:id` | Sesión (organizador que lo registró o `ADMIN`) | Elimina el árbitro y sus asignaciones. |
| PUT | `/api/v1/referees/:id/availability` | Sesión (organizador, `ADMIN` o el propio árbitro) | Reemplaza la disponibilidad semanal. |
| GET | `/api/v1/referees/:id/assignments` | Sesión (organizador, `ADMIN` o el propio árbitro) | Asignaciones del árbitro con los datos del partido. |
| GET | `/api/v1/assignments/mine` | Sesión | Asignaciones del usuario (árbitro enlazado por correo). |
| GET | `/api/v1/assignments` | Rol `ORGANIZER` o `ADMIN` | Partidos publicados del organizador con su asignación activa; filtros `leagueId` y `matchIds`. |
| POST | `/api/v1/assignments` | Rol `ORGANIZER` o `ADMIN` (organizador del partido) | Asignación manual (`matchId`, `refereeId`); reemplaza la anterior. Publica `referee.assigned`. |
| POST | `/api/v1/assignments/auto` | Rol `ORGANIZER` o `ADMIN` (organizador de la liga) | Asigna automáticamente los partidos futuros sin árbitro de una liga (`leagueId`). Devuelve `{ assigned, unassigned }`. |
| PUT | `/api/v1/assignments/:id/confirm` | Sesión (árbitro asignado, su organizador o `ADMIN`) | Confirma (`confirmed: true`) o rechaza (`false`); al rechazar se busca otro árbitro. |
| DELETE | `/api/v1/assignments/:id` | Sesión (organizador o `ADMIN`) | Elimina la asignación. |
| GET | `/api/v1/internal/assignments/check` | Interno | `?matchId=&email=` → `{ assigned, refereeName }`. Lo usa el Live Score Service para autorizar al árbitro. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks y canales suscritos; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus, incluida `referee_assignments_total` (por resultado y modo automático o manual). |

## Eventos

Se publican y consumen en **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre
JSON (`id`, `type`, `version`, `source`, `occurredAt`, `requestId`, `data`). Cada evento publicado también
se guarda en la lista `events:recent` (últimos 200) que muestra el panel de administración.

**Publica**

| Evento (canal) | Cuándo | Datos (`data`) | Quién lo consume |
|---|---|---|---|
| `referee.assigned` | Al asignar un árbitro (automática o manualmente) | `assignmentId`, `matchId`, `refereeId`, `refereeName`, `refereeEmail`, `leagueId`, `leagueName`, `ownerId`, `label`, `scheduledAt`, `venueName`, `manual` | Notification Service: avisa al árbitro (en la app y por correo) |
| `referee.unassigned` | Cuando no hay ningún árbitro disponible para un partido | `matchId`, `leagueId`, `leagueName`, `ownerId`, `label`, `scheduledAt`, `reason` | Notification Service: avisa al organizador |

**Consume**

| Evento (canal) | Lo publica | Qué hace |
|---|---|---|
| `fixture.published` | Fixture | Crea o actualiza la proyección de cada partido de la jornada y asigna un árbitro a los que no tienen uno activo. |
| `match.rescheduled` | Fixture | Actualiza fecha y cancha; conserva al árbitro si sigue disponible o busca otro. |
| `match.suspended` | Fixture | Marca la proyección del partido como `SUSPENDED`. |
| `match.completed` | Live Score | Marca la proyección del partido como `FINISHED`. |

## Comunicación con otros servicios

- **No hace llamadas REST** a otros microservicios: todo lo que necesita del calendario le llega por
  eventos.
- **Recibe** del Live Score Service la llamada `GET /api/v1/internal/assignments/check?matchId=&email=`
  (timeout de 1500 ms en el cliente de Live Score, que guarda el resultado positivo 5 minutos en Redis).

## Base de datos

Base propia **`referee_db`** en PostgreSQL 16 (usuario `referee_user` en Docker Compose). Ningún otro
servicio puede conectarse a ella. Tipo enumerado: `AssignmentStatus` (`ASSIGNED`, `CONFIRMED`,
`DECLINED`).

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `referees` | `id` (UUID, PK), `owner_id`, `league_id` (nulo = todas las ligas del organizador), `name`, `email`, `phone`, `zone`, `categories_certified` (`text[]`), `active`, `created_at`, `updated_at` | Único `referees_owner_id_email_key` (`owner_id`, `email`); índices `referees_zone_idx` y `referees_email_idx` |
| `referee_availability` | `id` (UUID, PK), `referee_id`, `day_of_week`, `start_time`, `end_time` | Índice `referee_availability_referee_id_idx`; FK `referee_id` → `referees.id` con `ON DELETE CASCADE` |
| `scheduled_matches` | `match_id` (PK), `league_id`, `league_name`, `category_id`, `owner_id`, `round`, `label`, `scheduled_at`, `venue_name`, `venue_zone`, `status` (texto, por defecto `SCHEDULED`), `updated_at` | Índices `scheduled_matches_league_id_idx` y `scheduled_matches_scheduled_at_idx` |
| `referee_assignments` | `id` (UUID, PK), `match_id`, `referee_id`, `scheduled_at`, `confirmed`, `status` (por defecto `ASSIGNED`), `manual`, `created_at`, `updated_at` | Único `referee_assignments_match_id_referee_id_key` (`match_id`, `referee_id`); índices por `match_id` y `referee_id`; FK `referee_id` → `referees.id` con `ON DELETE CASCADE` |

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
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges referee_db > services/referee-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4005` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://referee_user:sl_dev_pass@postgres:5432/referee_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `referee_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `REFEREE_MATCH_MINUTES` | No | `120` | Minutos que un partido bloquea la agenda del árbitro (para la disponibilidad y los cruces). |
| `LEAGUE_UTC_OFFSET` | No | `-05:00` | Diferencia horaria de la liga respecto a UTC, para comparar la hora del partido con la disponibilidad declarada en hora local. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `referee-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId` (trazabilidad por partido). |

`.env.example` también incluye `LEAGUE_TIMEZONE`, común a la plataforma; este servicio no la usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-referee-service`, publicada por GitHub
  Actions desde el repositorio principal (`.github/workflows/referee-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_REFEREE`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-referee.onrender.com. Usa la
  PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y el Key Value
  `sportsleague-jd-redis`. Es un servicio web público, pero sin `x-internal-token` solo responde `/health`
  y `/metrics`. `REFEREE_MATCH_MINUTES` no se define allí, así que usa el valor por defecto (120).
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. Un servicio
  dormido no recibe los eventos de Redis (Pub/Sub no los guarda). La PostgreSQL gratuita caduca a los 30
  días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
