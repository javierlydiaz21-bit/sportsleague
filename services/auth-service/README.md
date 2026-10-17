# Auth Service · SportsLeague

Microservicio de identidad de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Registra las cuentas, inicia y cierra sesión, emite los tokens de acceso
JWT y los refresh tokens rotativos, y permite al administrador cambiar roles y suspender cuentas.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4001 | `auth_db` | [sportsleague-auth-service](https://github.com/javierlydiaz21-bit/sportsleague-auth-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Registro** de cuentas con los roles de autoservicio `ORGANIZER` (por defecto), `REFEREE` o
  `SPECTATOR`. El rol `ADMIN` no se puede pedir al registrarse.
- **Inicio de sesión** con contraseñas cifradas con **bcrypt** (10 rondas). Ante un correo inexistente
  compara contra un hash ficticio para tardar lo mismo que con una contraseña errónea.
- **Access token JWT** HS256 de 15 minutos (`ACCESS_TOKEN_TTL_SECONDS`), con emisor `sportsleague-auth`,
  audiencia `sportsleague` y los datos `sub`, `email`, `name` y `role`.
- **Refresh tokens** opacos, guardados solo como hash SHA-256 y **rotativos**: cada uso emite uno nuevo y
  revoca el anterior. Si se reutiliza uno ya revocado (posible robo) se cierran todas las sesiones del
  usuario; hay 15 s de gracia para solicitudes simultáneas. Duran 7 días (`REFRESH_TOKEN_TTL_DAYS`).
- **Web y móvil**: en la web el refresh token viaja en la cookie `sl_refresh` (`httpOnly`,
  `Path=/api/v1/auth`, `SameSite` y `Secure` configurables); con `"client": "mobile"` viaja en el cuerpo.
- **CSRF**: el refresh por cookie exige la cabecera `X-CSRF-Token` con el token anti-CSRF que se entrega
  al iniciar sesión (también se guarda como hash).
- **Perfil**: consultar los datos propios y cambiar el nombre o la contraseña (pide la actual).
- **Administración de cuentas** (solo `ADMIN`): listar y buscar usuarios, ver estadísticas y cambiar el
  rol o el estado. Al suspender una cuenta revoca sus refresh tokens y escribe en Redis la clave
  `auth:suspended:<id>` (1 h) para que el API Gateway bloquee al instante su JWT aunque siga vigente.
- **Cuenta de administrador inicial**: al arrancar crea el usuario de `ADMIN_EMAIL` / `ADMIN_PASSWORD`
  si no existe; si existe con otro rol o suspendido, lo deja como `ADMIN` activo.

**Qué no hace**

- No valida el JWT en cada solicitud: lo hace el **API Gateway** con el mismo `JWT_SECRET`.
- No guarda ligas, equipos ni partidos, ni decide permisos de negocio (por ejemplo «organizador de esta
  liga»): cada servicio los aplica con la identidad que propaga el gateway.
- No envía correos: publica `user.registered` y el Notification Service avisa a los administradores.

**Por qué es un servicio aparte**: el documento de arquitectura exige cuentas, JWT con refresh tokens y
bcrypt, pero no asignaba ningún servicio a esa función. Aislar las credenciales en un servicio con base
propia reduce la superficie de ataque (es el único que toca hashes de contraseñas) y permite desplegar o
escalar el inicio de sesión sin afectar al resto.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `auth_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub), lista de cuentas suspendidas, trazas |
| bcryptjs | 3 | Hash de contraseñas |
| jsonwebtoken | 9 | Firma de los access tokens |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
auth-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4001)
│   ├── app.module.ts         módulo raíz
│   ├── auth/                 registro, login, refresh, logout y perfil (tokens.ts: JWT, hashes y cookies)
│   ├── users/                gestión de cuentas (solo ADMIN)
│   ├── prisma/               PrismaService (conexión y health check de la base)
│   └── chassis/              código común copiado del repositorio principal; no se edita aquí
├── prisma/
│   ├── schema.prisma         modelo de datos
│   └── migrations/           migraciones SQL (se aplican al arrancar)
├── database/                 esquema, datos de ejemplo y respaldo en SQL (ver «Base de datos»)
├── test/                     pruebas de integración HTTP (*.e2e.spec.ts) y dobles de prueba
├── Dockerfile                imagen multietapa; aplica las migraciones antes de arrancar
├── .env.example              variables para ejecutar fuera de Docker
├── package.json              scripts (build, start:dev, lint, test…) y dependencias
└── eslint.config.mjs, tsconfig.json, tsconfig.build.json, nest-cli.json
```

`src/chassis/` es el *microservice chassis* (logs JSON, métricas, `/health`, guard de autenticación,
bus de eventos, caché, cliente REST resiliente y validación). Se mantiene en la carpeta `chassis/` del
repositorio principal y se copia a cada servicio con `node scripts/sync-chassis.mjs`.

## Instalación y ejecución

El servicio escucha en el puerto **4001**. En las tres opciones la comprobación es
`GET http://localhost:4001/health`, que responde `200` con
`{"status":"ok","service":"auth-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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
docker compose ps auth-service                                   # estado "healthy"
docker compose exec auth-service wget -qO- http://127.0.0.1:4001/health
```

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles. Lo más sencillo es levantar los del repositorio principal con
`docker compose up -d postgres redis`: quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base
`auth_db` y su usuario `auth_user` ya creados.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-auth-service.git
cd sportsleague-auth-service
docker build -t sportsleague-auth-service .
docker run --rm -p 4001:4001 \
  -e DATABASE_URL=postgresql://auth_user:sl_dev_pass@host.docker.internal:5440/auth_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e JWT_SECRET=dev-jwt-secret-change-me \
  sportsleague-auth-service
curl http://localhost:4001/health
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
curl http://localhost:4001/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo:

```bash
curl -X POST http://localhost:4001/api/v1/auth/login \
  -H "x-internal-token: dev-internal-token-change-me" -H "content-type: application/json" \
  -d '{"email":"admin@sportsleague.com","password":"Admin12345","client":"mobile"}'
```

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL ni Redis: usan una base de datos simulada en memoria
(`test/fake-prisma.ts`), un Redis falso y el bus de eventos en memoria. Cubren, entre otros, la rotación
de refresh tokens, la detección de reutilización, el CSRF y la gestión de cuentas.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido.
*Rol* = solo esos roles (`@Roles`). *Interno* = solo entre servicios.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Público | Crea una cuenta (`name`, `email`, `password` de 8 a 72 caracteres con letras y números, `role` y `client` opcionales) y abre sesión. Publica `user.registered`. |
| POST | `/api/v1/auth/login` | Público | Inicia sesión. Devuelve `user`, `accessToken`, `expiresIn`, `csrfToken` y el refresh token (en cookie o, con `client: "mobile"`, en el cuerpo). |
| POST | `/api/v1/auth/refresh` | Público (refresh token) | Rota el refresh token y emite un access token nuevo. Por cookie exige `X-CSRF-Token`; también acepta `refreshToken` en el cuerpo. |
| POST | `/api/v1/auth/logout` | Público | Revoca el refresh token y borra la cookie. |
| GET | `/api/v1/auth/me` | Sesión | Perfil del usuario autenticado. |
| PATCH | `/api/v1/auth/me` | Sesión | Cambia el nombre o la contraseña (`currentPassword` y `newPassword`). |
| GET | `/api/v1/users` | Rol `ADMIN` | Lista paginada de usuarios con filtros `q`, `role`, `status`, `page` y `limit` (máximo 100). |
| GET | `/api/v1/users/stats` | Rol `ADMIN` | Totales por rol y por estado, y registros de los últimos 7 días. |
| PATCH | `/api/v1/users/:id` | Rol `ADMIN` | Cambia el `role` o el `status` (`ACTIVE` / `SUSPENDED`) de otra cuenta. Publica `user.updated`. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos y suscripciones; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus (HTTP, eventos publicados y consumidos). |

En el gateway, las rutas `/api/v1/users/*` también están restringidas a `ADMIN`, y `login`, `register`
y `refresh` tienen el límite más estricto de rate limiting (20 por minuto e IP).

## Eventos

Se publican en **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre JSON
(`id`, `type`, `version`, `source`, `occurredAt`, `requestId`, `data`). Cada evento publicado también se
guarda en la lista `events:recent` (últimos 200) que muestra el panel de administración.

**Publica**

| Evento (canal) | Cuándo | Datos (`data`) | Quién lo consume |
|---|---|---|---|
| `user.registered` | Al registrarse una cuenta | `userId`, `email`, `name`, `role` | Notification Service: avisa a los administradores |
| `user.updated` | Cuando el administrador cambia el rol o el estado de una cuenta | `userId`, `email`, `name`, `role`, `status`, `changedBy` | Ningún servicio lo consume por ahora; se ve en el panel *Eventos* |

**Consume**: ningún evento.

## Comunicación con otros servicios

- **No hace llamadas REST** a otros microservicios.
- **Recibe** las solicitudes del API Gateway para `/api/v1/auth/*` y `/api/v1/users/*`.
- **Comparte con el gateway** el `JWT_SECRET` (Auth firma, el gateway valida) y la clave de Redis
  `auth:suspended:<id>` (Auth la escribe al suspender y la borra al reactivar; el gateway la consulta en
  cada solicitud con token).

## Base de datos

Base propia **`auth_db`** en PostgreSQL 16 (usuario `auth_user` en Docker Compose). Ningún otro servicio
puede conectarse a ella. Tipos enumerados: `Role` (`ADMIN`, `ORGANIZER`, `REFEREE`, `SPECTATOR`) y
`UserStatus` (`ACTIVE`, `SUSPENDED`).

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `users` | `id` (UUID, PK), `email`, `name`, `password_hash`, `role` (por defecto `ORGANIZER`), `status` (por defecto `ACTIVE`), `last_login_at`, `created_at`, `updated_at` | Único `users_email_key` (`email`); índices `users_role_idx` y `users_status_idx` |
| `refresh_tokens` | `id` (UUID, PK), `user_id`, `token_hash`, `csrf_hash`, `expires_at`, `revoked_at`, `replaced_by`, `user_agent`, `ip`, `created_at` | Único `refresh_tokens_token_hash_key` (`token_hash`); índice `refresh_tokens_user_id_idx`; FK `user_id` → `users.id` con `ON DELETE CASCADE` |

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
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges auth_db > services/auth-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4001` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://auth_user:sl_dev_pass@postgres:5432/auth_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `auth_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos, lista de suspendidos y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `JWT_SECRET` | Sí en producción | `dev-jwt-secret-change-me` | Secreto HS256 para firmar los access tokens. Debe ser el mismo que usa el API Gateway. |
| `ACCESS_TOKEN_TTL_SECONDS` | No | `900` | Duración del access token (segundos). |
| `REFRESH_TOKEN_TTL_DAYS` | No | `7` | Duración del refresh token y de su cookie (días). |
| `ADMIN_EMAIL` | No | `admin@sportsleague.com` | Correo de la cuenta de administrador que se crea al arrancar. |
| `ADMIN_PASSWORD` | Sí en producción | `Admin12345` | Contraseña inicial de esa cuenta (solo se usa al crearla). |
| `ADMIN_NAME` | No | `Administrador` | Nombre de esa cuenta. |
| `COOKIE_SECURE` | No | `false` | `true` marca la cookie `sl_refresh` como `Secure` (obligatorio con HTTPS, como en Render). |
| `COOKIE_SAMESITE` | No | `lax` | `SameSite` de la cookie. En Render es `none` porque la web (Vercel) y la API (onrender.com) están en dominios distintos. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `auth-service` | Nombre del servicio en logs, métricas y en el campo `source` de los eventos. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId`. |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; este
servicio no las usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-auth-service`, publicada por GitHub
  Actions desde el repositorio principal (`.github/workflows/auth-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_AUTH`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-auth.onrender.com. Usa la
  PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`), el Key Value
  `sportsleague-jd-redis`, `COOKIE_SECURE=true` y `COOKIE_SAMESITE=none`. `JWT_SECRET` e
  `INTERNAL_API_TOKEN` los genera Render; `ADMIN_PASSWORD` se escribe al crear el blueprint.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. La PostgreSQL
  gratuita caduca a los 30 días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
