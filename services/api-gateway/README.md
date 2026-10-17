# API Gateway · SportsLeague

Punto de entrada único de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur (fútbol,
básquet y vóley). Recibe todas las solicitudes HTTP de la web, valida el JWT, aplica CORS, rate limiting
y el bloqueo de cuentas suspendidas, propaga la identidad del usuario y reenvía cada solicitud al
microservicio que corresponde. Además ofrece al administrador una vista agregada de la salud de la
plataforma, del bus de eventos y de la trazabilidad de cada partido.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4000 | No tiene (usa Redis) | [sportsleague-api-gateway](https://github.com/javierlydiaz21-bit/sportsleague-api-gateway) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Enrutamiento** por prefijo de ruta hacia los 9 microservicios (ver la tabla de enrutamiento), con
  `http-proxy-middleware`. El cuerpo se reenvía sin parsear, tal como llegó.
- **Autenticación centralizada**: verifica la firma HS256, la expiración, el emisor (`sportsleague-auth`)
  y la audiencia (`sportsleague`) del `Authorization: Bearer <token>`. Si el token no es válido responde
  `401` con el código `TOKEN_EXPIRED` o `TOKEN_INVALID`.
- **Propagación de identidad**: añade `x-user-id`, `x-user-role`, `x-user-email` y `x-user-name`, el
  `x-internal-token` y el `x-request-id`. Antes **borra** esas cabeceras si las envía el cliente, para que
  nadie pueda suplantar a otro usuario.
- **Reglas de acceso generales**: las lecturas (`GET`, `HEAD`) pasan sin sesión y cada servicio decide;
  las escrituras exigen sesión, salvo `POST /api/v1/auth/login`, `register`, `refresh` y `logout`. Algunas
  rutas exigen rol `ADMIN` también aquí (defensa en profundidad).
- **Bloqueo inmediato de cuentas suspendidas**: si existe la clave `auth:suspended:<id>` en Redis (la
  escribe el Auth Service al suspender), responde `403` con el código `ACCOUNT_SUSPENDED` aunque el JWT
  siga vigente.
- **Rutas internas bloqueadas**: `/api/v1/internal/*` responde `404`; solo se usan entre servicios.
- **CORS** con lista blanca (`CORS_ORIGINS`) y credenciales; los orígenes no permitidos reciben `403`.
  Cabeceras de seguridad con **Helmet**.
- **Rate limiting por niveles**, compartido entre réplicas mediante Redis.
- **Despertador para Render Free** (`WAKE_SERVICES`): despierta a todos los servicios dormidos en cuanto
  llega tráfico.
- **Panel del sistema** para el administrador (`/api/v1/system/*`): salud agregada de los 10 servicios,
  últimos eventos del bus y trazabilidad por partido.
- **Métricas** por servicio destino (`gateway_requests_total`, `gateway_request_duration_seconds`) y de
  rechazos por rate limiting (`gateway_rate_limit_rejections_total`).

**Qué no hace**

- No emite tokens ni guarda cuentas (Auth Service) y no tiene base de datos.
- No contiene lógica de negocio ni permisos finos (por ejemplo «organizador de esta liga» o «árbitro
  asignado a este partido»): los aplica cada servicio con la identidad que el gateway propaga.
- No atiende el WebSocket: los espectadores se conectan directamente al Live Score Service (puerto 4006).

**Por qué es un servicio aparte**: un único punto de entrada concentra las preocupaciones transversales
(seguridad, CORS, límites de uso, observabilidad) y permite que los microservicios vivan en una red
privada sin exponer sus puertos.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| http-proxy-middleware | 3 | Proxy inverso hacia cada microservicio |
| jsonwebtoken | 9 | Validación de los JWT |
| Helmet | 8 | Cabeceras HTTP de seguridad |
| Redis + ioredis | Redis 7, ioredis 5 | Contadores de rate limiting, lista de suspendidos, eventos recientes y trazas |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de parámetros del panel del sistema |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

No usa Prisma ni PostgreSQL.

## Estructura del proyecto

```
api-gateway/
├── src/
│   ├── main.ts               arranque y orden de los middlewares (puerto 4000)
│   ├── app.module.ts         módulo raíz (chassis sin el guard de servicio)
│   ├── gateway/
│   │   ├── routes.ts                 tabla de enrutamiento, rutas de ADMIN, rutas internas y niveles de rate limiting
│   │   ├── auth.middleware.ts        validación del JWT, cabeceras de identidad y rechazo de orígenes
│   │   ├── rate-limit.middleware.ts  rate limiting por ventana fija en Redis
│   │   ├── proxy.ts                  un proxy por microservicio y sus métricas
│   │   ├── wake.ts                   despertador para Render Free
│   │   ├── system.controller.ts      rutas /api/v1/system (panel del administrador)
│   │   └── system.service.ts         salud agregada, eventos recientes y trazas
│   └── chassis/              código común copiado del repositorio principal; no se edita aquí
├── test/                     integración con un microservicio simulado (gateway.e2e.spec.ts)
├── Dockerfile                imagen multietapa (sin migraciones: no tiene base de datos)
├── .env.example              variables para ejecutar fuera de Docker
├── package.json              scripts (build, start:dev, lint, test…) y dependencias
└── eslint.config.mjs, tsconfig.json, tsconfig.build.json, nest-cli.json
```

No tiene carpetas `prisma/` ni `database/` porque no tiene base de datos propia.

`src/chassis/` es el *microservice chassis* (logs JSON, métricas, `/health`, bus de eventos, caché,
cliente REST resiliente y validación). Se mantiene en la carpeta `chassis/` del repositorio principal y
se copia a cada servicio con `node scripts/sync-chassis.mjs`. El gateway lo usa sin el guard de servicio
(`ChassisModule.forRoot({ authGuard: false })`) porque valida los JWT con su propio middleware.

## Instalación y ejecución

El gateway escucha en el puerto **4000**. En las tres opciones la comprobación es
`GET http://localhost:4000/health`, que responde `200` con
`{"status":"ok","service":"api-gateway","checks":{"redis":{...}}}` (o `503` y `"degraded"` si Redis no
responde).

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

La primera construcción tarda entre 10 y 20 minutos. El gateway publica el puerto 4000:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/leagues          # lectura pública reenviada al League Service
```

### b) Solo este servicio con Docker

Necesita Redis y, para que las rutas respondan, los microservicios a los que reenvía. Lo más sencillo es
levantar Redis del repositorio principal con `docker compose up -d redis` (queda en `127.0.0.1:6380`).

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-api-gateway.git
cd sportsleague-api-gateway
docker build -t sportsleague-api-gateway .
docker run --rm -p 4000:4000 \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e JWT_SECRET=dev-jwt-secret-change-me \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e AUTH_SERVICE_URL=http://host.docker.internal:4001 \
  -e LEAGUE_SERVICE_URL=http://host.docker.internal:4002 \
  -e TEAM_SERVICE_URL=http://host.docker.internal:4003 \
  -e FIXTURE_SERVICE_URL=http://host.docker.internal:4004 \
  -e REFEREE_SERVICE_URL=http://host.docker.internal:4005 \
  -e LIVE_SCORE_SERVICE_URL=http://host.docker.internal:4006 \
  -e STATISTICS_SERVICE_URL=http://host.docker.internal:4007 \
  -e NOTIFICATION_SERVICE_URL=http://host.docker.internal:4008 \
  -e ANALYTICS_SERVICE_URL=http://host.docker.internal:4009 \
  sportsleague-api-gateway
curl http://localhost:4000/health
```

Dentro de un contenedor, `localhost` es el propio contenedor, por eso las URL de los servicios apuntan a
`host.docker.internal` (el equipo anfitrión en Docker Desktop; en Linux añade
`--add-host=host.docker.internal:host-gateway`). En PowerShell, cambia la `\` del final de cada línea por
un acento grave (`` ` ``). Un servicio que no esté levantado responde `503`.

### c) En local sin Docker

Requisitos: Node.js 22 o superior y Redis (por ejemplo, el del punto anterior; los valores de
`.env.example` ya apuntan a `localhost:6380` y a los servicios en `localhost:4001` … `localhost:4009`).

```bash
npm ci
cp .env.example .env            # ajusta los valores si tu Redis o tus servicios son otros
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4000/health
```

## Pruebas y calidad

```bash
npm ci
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan Redis ni los microservicios: usan un Redis falso y un microservicio simulado.
Cubren la tabla de enrutamiento, las rutas internas bloqueadas y las de administrador, los niveles y el
rechazo `429` del rate limiting (y que deja pasar si Redis no responde), el despertador, la propagación
de identidad con el cuerpo intacto, la eliminación de cabeceras falsificadas y el bloqueo de usuarios
suspendidos.

## Endpoints principales

### Endpoints propios del gateway

**Acceso**: *Abierto* = sin token. *Rol `ADMIN`* = JWT válido de un administrador (lo comprueba el
middleware del gateway).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Abierto | Salud del gateway (Redis). `200` o `503`. |
| GET | `/status` | Rol `ADMIN` | Versión, tiempo activo, memoria y checks del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus (HTTP, solicitudes y latencia por servicio destino, rechazos por rate limiting). |
| GET | `/api/v1/system/health` | Rol `ADMIN` | Salud agregada: consulta `/status` de los 9 servicios (con el token interno y timeout de 2,5 s), Redis y el número de suscriptores de cada canal de eventos (`PUBSUB NUMSUB`). Estado general `ok`, `degraded` o `down`. |
| GET | `/api/v1/system/events` | Rol `ADMIN` | Últimos eventos del bus (lista `events:recent` de Redis); `limit` de 1 a 200, por defecto 50. |
| GET | `/api/v1/system/traces` | Rol `ADMIN` | Partidos con trazas recientes y su última actividad; `limit` de 1 a 200, por defecto 30. |
| GET | `/api/v1/system/traces/:matchId` | Rol `ADMIN` | Recorrido completo de un partido por todos los servicios (Redis Stream `trace:match:<id>`). |

`/health`, `/status` y `/metrics` no llevan el prefijo `/api/v1` (ver `src/chassis/bootstrap.ts`).

### Tabla de enrutamiento

Todo lo demás bajo `/api/v1` se reenvía según esta tabla (el orden importa: gana la primera coincidencia).
Las rutas detalladas de cada servicio están en su propio README.

| Orden | Ruta (prefijo) | Servicio destino | Variable |
|---|---|---|---|
| 1 | `/api/v1/auth/*`, `/api/v1/users/*` | Auth Service | `AUTH_SERVICE_URL` |
| 2 | `/api/v1/matches/:id/events`, `/live`, `/start`, `/complete` | Live Score Service | `LIVE_SCORE_SERVICE_URL` |
| 3 | `/api/v1/live/*` | Live Score Service | `LIVE_SCORE_SERVICE_URL` |
| 4 | `/api/v1/seasons/:id/fixtures/*` | Fixture Service | `FIXTURE_SERVICE_URL` |
| 5 | `/api/v1/fixtures/*`, `/api/v1/matches/*` | Fixture Service | `FIXTURE_SERVICE_URL` |
| 6 | `/api/v1/players/:id/disciplinary-record` | Statistics Service | `STATISTICS_SERVICE_URL` |
| 7 | `/api/v1/standings/*`, `/api/v1/top-scorers/*`, `/api/v1/disciplinary/*`, `/api/v1/statistics/*` | Statistics Service | `STATISTICS_SERVICE_URL` |
| 8 | `/api/v1/teams/*`, `/api/v1/players/*` | Team Service | `TEAM_SERVICE_URL` |
| 9 | `/api/v1/leagues/*`, `/api/v1/seasons/*`, `/api/v1/categories/*`, `/api/v1/venues/*` | League Service | `LEAGUE_SERVICE_URL` |
| 10 | `/api/v1/referees/*`, `/api/v1/assignments/*` | Referee Service | `REFEREE_SERVICE_URL` |
| 11 | `/api/v1/notifications/*`, `/api/v1/subscriptions/*` | Notification Service | `NOTIFICATION_SERVICE_URL` |
| 12 | `/api/v1/analytics/*` | Analytics Service | `ANALYTICS_SERVICE_URL` |

Si el servicio destino no responde, el gateway devuelve `503` con
`{"statusCode":503,"message":"El servicio <nombre> no está disponible en este momento","service":"<nombre>"}`.

### Reglas de acceso que aplica el gateway

| Regla | Rutas | Respuesta si no se cumple |
|---|---|---|
| Rutas internas bloqueadas | `/api/v1/internal/*` | `404` |
| Escrituras con sesión | Todo método distinto de `GET`, `HEAD` y `OPTIONS` bajo `/api/`, salvo `POST /api/v1/auth/login`, `register`, `refresh` y `logout` | `401` «Debes iniciar sesión» |
| Solo `ADMIN` | `/api/v1/users/*`, `/api/v1/system/*`, `/status`, `PATCH /api/v1/leagues/:id/review`, `GET /api/v1/leagues/stats`, `/api/v1/analytics/overview`, `/api/v1/analytics/etl/*`, `/api/v1/notifications/deliveries` | `401` sin sesión, `403` con otro rol |
| Cuenta no suspendida | Toda solicitud con token | `403` `ACCOUNT_SUSPENDED` |
| Origen permitido | Toda solicitud con cabecera `Origin` | `403` «Origen no permitido por la política CORS» |

### Autenticación JWT

El gateway comparte `JWT_SECRET` con el Auth Service. Acepta solo `HS256`, con emisor `sportsleague-auth`
y audiencia `sportsleague`. Del token obtiene `sub` (id), `role`, `email` y `name`, y los reenvía en las
cabeceras `x-user-*` (el nombre codificado con `encodeURIComponent`). Cada microservicio exige además el
`x-internal-token`, de modo que nadie puede saltarse el gateway.

### CORS

`CORS_ORIGINS` (separados por comas) define los orígenes permitidos. Se aceptan credenciales (la cookie de
refresh), los métodos `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` y `OPTIONS`, las cabeceras
`Content-Type`, `Authorization`, `X-CSRF-Token` y `X-Request-Id`, y se exponen `X-Request-Id`,
`X-RateLimit-Limit`, `X-RateLimit-Remaining` y `Retry-After`. El *preflight* se guarda 10 minutos.

### Rate limiting por niveles

Ventana fija de `RATE_LIMIT_WINDOW_SECONDS` (60 s) con contadores atómicos en Redis
(`rl:<nivel>:<sujeto>:<ventana>`), compartidos entre réplicas. Solo se aplica a rutas `/api/`.

| Nivel | Solicitudes | Límite por defecto en el código | Valor en Docker Compose y `.env.example` | Se cuenta por |
|---|---|---|---|---|
| `auth` | `POST /api/v1/auth/login`, `register` y `refresh` | 20 (`RATE_LIMIT_AUTH`) | 20 | IP |
| `write` | `POST`, `PUT`, `PATCH`, `DELETE` (incluido `logout`) | 120 (`RATE_LIMIT_WRITE`) | 300 | Usuario (o IP sin sesión) |
| `read` | `GET` y `HEAD` | 600 (`RATE_LIMIT_READ`) | 1200 | Usuario (o IP sin sesión) |

Cada respuesta lleva `X-RateLimit-Limit` y `X-RateLimit-Remaining`; al superar el límite responde `429`
con `Retry-After`. Si Redis no responde, deja pasar la solicitud (se prioriza la disponibilidad). En
Render, `TRUST_PROXY=1` hace que la IP sea la del cliente y no la del proxy de Render.

### Despertador (`WAKE_SERVICES`)

En Render Free cada servicio se duerme tras 15 minutos sin tráfico. Con `WAKE_SERVICES=true`, cada vez
que llega una solicitud al gateway (como mucho una vez cada `WAKE_INTERVAL_MS`, 4 minutos por defecto)
consulta en segundo plano el `/health` de los 9 servicios (con 90 s de espera cada uno), sin retrasar la
solicitud. Así se despiertan todos a la vez y siguen despiertos mientras alguien use la plataforma. Junto
con `PROXY_TIMEOUT_MS=60000`, el gateway espera hasta 60 s a un servicio que se está despertando. En
Docker Compose está desactivado.

## Eventos

No publica ni consume eventos. Para el panel del administrador solo **lee** de Redis:

- la lista `events:recent`, donde cada servicio guarda los últimos 200 eventos que publica;
- el número de suscriptores de los 15 canales del bus (`user.registered`, `user.updated`,
  `league.created`, `league.reviewed`, `rules.updated`, `fixture.published`, `match.rescheduled`,
  `match.suspended`, `referee.assigned`, `referee.unassigned`, `match.started`, `match.event`,
  `match.event.deleted`, `match.completed`, `standings.updated`);
- las trazas por partido (`trace:matches` y los Redis Streams `trace:match:<id>`).

## Comunicación con otros servicios

| Destino | Cómo | Timeout | Reintentos |
|---|---|---|---|
| Los 9 microservicios (rutas de la API) | Proxy HTTP (`http-proxy-middleware`, `changeOrigin`, `X-Forwarded-*`) | `PROXY_TIMEOUT_MS` (15 s por defecto) | No; si falla responde `503` |
| Los 9 microservicios (`GET /status`) | `fetch` con `x-internal-token`, para `/api/v1/system/health` | 2500 ms | No |
| Los 9 microservicios (`GET /health`) | `fetch` en segundo plano, solo con `WAKE_SERVICES=true` | 90 s | No |

Las URL de los servicios aceptan `http://host:puerto`, `https://…` o solo `host:puerto`. El gateway no
usa el `ServiceClient` del chassis: no reintenta las solicitudes de los clientes porque podrían no ser
idempotentes.

## Base de datos

El API Gateway **no tiene base de datos propia** ni carpeta `database/`, y su Dockerfile no ejecuta
migraciones. Solo usa Redis:

| Clave de Redis | Quién la escribe | Uso en el gateway |
|---|---|---|
| `rl:<nivel>:<sujeto>:<ventana>` | El gateway | Contadores de rate limiting (caducan con la ventana) |
| `auth:suspended:<id>` | Auth Service | Bloqueo inmediato de cuentas suspendidas |
| `events:recent` | Todos los servicios que publican eventos | Panel *Eventos* |
| `trace:matches`, `trace:match:<id>` | Todos los servicios (chassis) | Panel *Trazabilidad* |

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4000` | Puerto HTTP. |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis compartido con los servicios. Docker Compose: `redis://redis:6379`. |
| `JWT_SECRET` | Sí en producción | `dev-jwt-secret-change-me` | Secreto HS256 para validar los JWT. Debe ser el mismo del Auth Service. |
| `INTERNAL_API_TOKEN` | Sí en producción | `dev-internal-token-change-me` | Token que el gateway añade en `x-internal-token`; debe coincidir con el de los servicios. |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Orígenes permitidos, separados por comas. Render: `https://sportsleague-cyan.vercel.app`. |
| `AUTH_SERVICE_URL` | No | `http://localhost:4001` | URL del Auth Service. Docker Compose: `http://auth-service:4001`. |
| `LEAGUE_SERVICE_URL` | No | `http://localhost:4002` | URL del League Service. |
| `TEAM_SERVICE_URL` | No | `http://localhost:4003` | URL del Team Service. |
| `FIXTURE_SERVICE_URL` | No | `http://localhost:4004` | URL del Fixture Service. |
| `REFEREE_SERVICE_URL` | No | `http://localhost:4005` | URL del Referee Service. |
| `LIVE_SCORE_SERVICE_URL` | No | `http://localhost:4006` | URL del Live Score Service. |
| `STATISTICS_SERVICE_URL` | No | `http://localhost:4007` | URL del Statistics Service. |
| `NOTIFICATION_SERVICE_URL` | No | `http://localhost:4008` | URL del Notification Service. |
| `ANALYTICS_SERVICE_URL` | No | `http://localhost:4009` | URL del Analytics Service. |
| `RATE_LIMIT_AUTH` | No | `20` | Límite del nivel `auth` por ventana. |
| `RATE_LIMIT_WRITE` | No | `120` | Límite del nivel `write` por ventana (Docker Compose y `.env.example`: `300`). |
| `RATE_LIMIT_READ` | No | `600` | Límite del nivel `read` por ventana (Docker Compose y `.env.example`: `1200`). |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Duración de la ventana de rate limiting. |
| `PROXY_TIMEOUT_MS` | No | `15000` | Tiempo máximo de espera de cada solicitud reenviada. Render Free: `60000`. |
| `WAKE_SERVICES` | No | `false` | `true` activa el despertador de servicios (solo en Render Free). |
| `WAKE_INTERVAL_MS` | No | `240000` | Intervalo mínimo entre dos rondas del despertador (4 minutos). |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express; determina la IP del cliente para el rate limiting. Render: `1`. |
| `SERVICE_NAME` | No | `api-gateway` | Nombre del servicio en logs y métricas. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informan `/status` y `/api/v1/system/health`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId`. |

`.env.example` también incluye `LEAGUE_UTC_OFFSET` y `LEAGUE_TIMEZONE`, comunes a la plataforma; el
gateway no las usa. No necesita `DATABASE_URL` ni `DATABASE_NAME`.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-api-gateway`, publicada por GitHub
  Actions desde el repositorio principal (`.github/workflows/api-gateway.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_GATEWAY`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-gateway.onrender.com. Es la URL
  que usa la web publicada en https://sportsleague-cyan.vercel.app (`NEXT_PUBLIC_API_URL` y
  `API_INTERNAL_URL` en Vercel). Allí se configuran `WAKE_SERVICES=true`, `PROXY_TIMEOUT_MS=60000`,
  `TRUST_PROXY=1`, `CORS_ORIGINS` con la URL de Vercel y las URL públicas `https://sportsleague-jd-<servicio>.onrender.com`
  de los 9 servicios; `JWT_SECRET` e `INTERNAL_API_TOKEN` los genera Render. No define `RATE_LIMIT_*`, así
  que rigen los valores por defecto del código (20/120/600).
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el gateway se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  al despertar, su despertador despierta a los demás servicios.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
