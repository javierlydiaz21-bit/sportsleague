# Notification Service · SportsLeague

Microservicio de notificaciones de **SportsLeague**, la plataforma de gestión de ligas deportivas amateur
(fútbol, básquet y vóley). Escucha los eventos de la plataforma y genera avisos en la bandeja de cada
usuario (administradores, organizadores, árbitros y aficionados que siguen una liga), envía correos
reales desde Gmail a través de un Google Apps Script, notificaciones push reales al navegador (Web Push) y
registra cada envío.

| Puerto | Base de datos | Repositorio del servicio | Sistema completo |
|---|---|---|---|
| 4008 | `notification_db` | [sportsleague-notification-service](https://github.com/javierlydiaz21-bit/sportsleague-notification-service) | [sportsleague](https://github.com/javierlydiaz21-bit/sportsleague) |

## Responsabilidad

**Qué hace**

- **Bandeja en la aplicación**: cada notificación va dirigida a un usuario, a un correo (los árbitros se
  enlazan por correo) o a un rol (`ADMIN`). Cada usuario ve las suyas, las de su correo y las de su rol,
  con el conteo de no leídas.
- **Seguir ligas**: los usuarios se suscriben a una liga para recibir sus avisos.
- **Reacciona a los eventos** de League, Auth, Fixture, Referee y Live Score (ver «Eventos») con
  plantillas en español; las fechas se muestran en la zona horaria de la liga (`LEAGUE_TIMEZONE`).
- **Idempotencia**: cada notificación tiene una `dedupe_key` única (`<id del evento>:<destinatario>`); si
  el mismo evento llega dos veces no se duplican ni los avisos ni los envíos.
- **Correo real** con Gmail: hace un `POST` por HTTPS a un Google Apps Script publicado como aplicación
  web (`apps-script/enviar-correo.gs`), que envía el correo desde la cuenta de Gmail que lo publicó. Se usa
  HTTPS porque **Render Free bloquea los puertos SMTP**. Reciben correo los seguidores de la liga (jornada
  publicada, reprogramación, suspensión y resultado final), el árbitro asignado y el propio usuario en la
  notificación de prueba.
- **Simulación**: sin `MAIL_RELAY_URL`, o si el destinatario es de un dominio de `MAIL_SKIP_DOMAINS` (por
  defecto `demo.com`, `example.com` y `sportsleague.com`), el correo queda como `SIMULATED`; si el script
  rechaza la clave o no responde en 15 s, queda como `FAILED`.
- **Push real en el navegador** con Web Push, el estándar de los navegadores (sin proveedor de pago): el
  usuario pulsa *Activar* en *Notificaciones*, el navegador se suscribe (`push_subscriptions`) y cada aviso
  se envía cifrado con las claves VAPID a todos sus navegadores, aunque tenga la web cerrada. Las
  suscripciones caducadas (404/410) se borran solas. Sin `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, o si el
  usuario no tiene navegadores suscritos, el push queda como `SIMULATED`.
- **Registro de envíos** por canal (`EMAIL`, `PUSH`) y resultado (`SENT`, `FAILED`, `SIMULATED`),
  visible para el administrador.
- **Preferencias** de canal por usuario (`emailEnabled`, `pushEnabled`): quien desactiva el correo deja de
  recibir los correos de las ligas que sigue, y quien desactiva el push no genera envíos push. La bandeja de
  la aplicación no depende de las preferencias. La notificación de prueba las ignora.

**Qué no hace**

- No decide cuándo ocurre algo: solo reacciona a los eventos que publican otros servicios.
- No gestiona cuentas (Auth) ni ligas (League), y no publica eventos.

**Por qué es un servicio aparte**: desacopla la comunicación con los usuarios. Los productores (League,
Auth, Fixture, Referee y Live Score) solo publican eventos, sin saber quién avisa ni cómo. Como las
plantillas están separadas de los canales, añadir un canal nuevo (SMS, WhatsApp) solo toca este servicio.

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22 (`node:22-alpine`, `engines >= 22`) | Entorno de ejecución (incluye `fetch` para el correo) |
| TypeScript | 5.9 | Lenguaje |
| NestJS | 11 (`@nestjs/core ^11.2.7`) | Framework HTTP sobre Express |
| Prisma | 6 (`^6.19.3`) | ORM y migraciones |
| PostgreSQL | 16 (`postgres:16-alpine` en Docker Compose) | Base de datos propia `notification_db` |
| Redis + ioredis | Redis 7, ioredis 5 | Bus de eventos (Pub/Sub) y trazas por partido |
| Google Apps Script (Gmail) | — | Envío real de correo por HTTPS (`apps-script/enviar-correo.gs`) |
| class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs con mensajes en español |
| prom-client | 15 | Métricas Prometheus en `/metrics` |
| Jest + Supertest | 29 / 7 | Pruebas unitarias y de integración HTTP |
| ESLint + typescript-eslint | 9 / 8 | Calidad de código |
| Docker | imagen multietapa `node:22-alpine` | Empaquetado y despliegue |

## Estructura del proyecto

```
notification-service/
├── src/
│   ├── main.ts               arranque con bootstrapService del chassis (puerto 4008)
│   ├── app.module.ts         módulo raíz
│   ├── notifications/
│   │   ├── notifications.controller.ts   bandeja, preferencias, envíos y suscripciones
│   │   ├── notifications.service.ts      consumidores de eventos, destinatarios y registro de envíos
│   │   ├── templates.ts                  plantillas de los mensajes (lógica pura)
│   │   └── mailer.ts                     envío de correo por HTTPS al Apps Script
│   ├── prisma/               PrismaService (conexión y health check de la base)
│   └── chassis/              código común copiado del repositorio principal; no se edita aquí
├── apps-script/
│   └── enviar-correo.gs      script de Google Apps Script que envía el correo desde Gmail
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

El servicio escucha en el puerto **4008**. En las tres opciones la comprobación es
`GET http://localhost:4008/health`, que responde `200` con
`{"status":"ok","service":"notification-service","checks":{"redis":{...},"database":{...}}}` (o `503` y
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
docker compose ps notification-service                            # estado "healthy"
docker compose exec notification-service wget -qO- http://127.0.0.1:4008/health
```

Para activar el correo real, pon `MAIL_RELAY_URL` y `MAIL_RELAY_SECRET` en el `.env` de la raíz del
repositorio principal (copia de `.env.example`) y ejecuta `docker compose up -d notification-service`.

### b) Solo este servicio con Docker

Necesita PostgreSQL 16 y Redis accesibles. Lo más sencillo es levantar los del repositorio principal con
`docker compose up -d postgres redis`: quedan en `127.0.0.1:5440` y `127.0.0.1:6380`, con la base
`notification_db` y su usuario `notification_user` ya creados. Los avisos se generan cuando llegan eventos
por Redis.

```bash
git clone https://github.com/javierlydiaz21-bit/sportsleague-notification-service.git
cd sportsleague-notification-service
docker build -t sportsleague-notification-service .
docker run --rm -p 4008:4008 \
  -e DATABASE_URL=postgresql://notification_user:sl_dev_pass@host.docker.internal:5440/notification_db \
  -e REDIS_URL=redis://host.docker.internal:6380 \
  -e INTERNAL_API_TOKEN=dev-internal-token-change-me \
  -e TEAM_SERVICE_URL=http://host.docker.internal:4003 \
  sportsleague-notification-service
curl http://localhost:4008/health
```

Añade `-e MAIL_RELAY_URL=... -e MAIL_RELAY_SECRET=...` para enviar correos reales. El contenedor ejecuta
`npx prisma migrate deploy` antes de `node dist/main.js`. `host.docker.internal` apunta al equipo
anfitrión en Docker Desktop; en Linux añade `--add-host=host.docker.internal:host-gateway`. En PowerShell,
cambia la `\` del final de cada línea por un acento grave (`` ` ``).

### c) En local sin Docker

Requisitos: Node.js 22 o superior, PostgreSQL y Redis (por ejemplo, los del punto anterior; los valores
de `.env.example` ya apuntan a `localhost:5440`, `localhost:6380` y al Team Service en `localhost:4003`).

```bash
npm ci
cp .env.example .env            # ajusta los valores; MAIL_RELAY_URL vacía = correos simulados
npx prisma generate
npx prisma migrate deploy
npm run start:dev               # modo desarrollo con recarga automática
curl http://localhost:4008/health
```

Las rutas de la API exigen la cabecera `x-internal-token`, que normalmente añade el API Gateway. Para
probar el servicio solo, envíala tú mismo junto con las cabeceras de identidad que pondría el gateway:

```bash
curl -X POST http://localhost:4008/api/v1/notifications/test \
  -H "x-internal-token: dev-internal-token-change-me" \
  -H "x-user-id: 00000000-0000-4000-8000-000000000001" -H "x-user-role: SPECTATOR" \
  -H "x-user-email: tu-correo@gmail.com"
```

### Configurar el correo real con Gmail

1. Entra en https://script.google.com → *Nuevo proyecto* y pega el contenido de `apps-script/enviar-correo.gs`.
2. Cambia la constante `SECRETO` por una clave larga: ese valor es `MAIL_RELAY_SECRET`.
3. *Implementar* → *Nueva implementación* → tipo *Aplicación web*. Ejecutar como: *Yo*. Quién tiene
   acceso: *Cualquier usuario*. Autoriza el acceso a Gmail.
4. La URL de la aplicación web (termina en `/exec`) es `MAIL_RELAY_URL`.
5. Prueba con `POST /api/v1/notifications/test` desde una cuenta con correo real: la respuesta incluye
   `emailStatus` (`SENT`, `FAILED` o `SIMULATED`).

Las cuentas gratuitas de Gmail permiten unos 100 correos al día con este método.

## Pruebas y calidad

```bash
npm ci
npx prisma generate     # genera los tipos del cliente de Prisma
npm run lint            # ESLint sobre src/ y test/
npm test                # Jest: src/**/*.spec.ts (unitarias) y test/*.e2e.spec.ts (integración HTTP)
npm run test:cov        # igual, con informe de cobertura en coverage/
```

Las pruebas no necesitan PostgreSQL, Redis ni Gmail: usan dobles en memoria y simulan el Apps Script.
Cubren el envío con la clave compartida, los estados `FAILED` y `SIMULATED`, la idempotencia con eventos
repetidos, los destinatarios (organizador y aficionados), las plantillas (zona horaria, cambio de sede u
horario, resultado final o corregido) y los permisos de la bandeja.

## Endpoints principales

Se consumen a través del API Gateway (`http://localhost:4000`). Todas las rutas, salvo `/health` y
`/metrics`, exigen la cabecera `x-internal-token` que añade el gateway; sin ella responden `401`.

**Acceso**: *Abierto* = sin token. *Público* = sin sesión. *Sesión* = cualquier usuario con JWT válido;
entre paréntesis, la comprobación adicional del servicio. *Rol* = solo esos roles (`@Roles`).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/v1/notifications` | Sesión | Bandeja del usuario (dirigidas a su id, a su correo o a su rol) con el conteo de no leídas; `limit` (como máximo 100 resultados). |
| GET | `/api/v1/notifications/unread-count` | Sesión | `{ unread }`. |
| GET | `/api/v1/notifications/preferences` | Sesión | Preferencias de canal del usuario. |
| PUT | `/api/v1/notifications/preferences` | Sesión | Guarda `emailEnabled` y `pushEnabled`. |
| POST | `/api/v1/notifications/test` | Sesión | Crea una notificación de prueba y la envía por correo y por push al usuario. Devuelve la notificación con `emailStatus` y `pushStatus`. |
| GET | `/api/v1/notifications/push/public-key` | Público | `{ publicKey }`: clave pública VAPID para suscribirse (`null` si el push no está configurado). |
| POST | `/api/v1/notifications/push/subscriptions` | Sesión | Guarda la suscripción del navegador (`{ endpoint, keys: { p256dh, auth } }`). |
| DELETE | `/api/v1/notifications/push/subscriptions?endpoint=` | Sesión | Borra la suscripción de ese navegador. |
| POST | `/api/v1/notifications/read-all` | Sesión | Marca todas como leídas; devuelve `{ updated }`. |
| GET | `/api/v1/notifications/deliveries` | Rol `ADMIN` | Últimos envíos por canal y resultado (`limit` hasta 200). |
| GET | `/api/v1/notifications/:userId` | Sesión (el propio usuario o `ADMIN`) | Bandeja de un usuario (ruta del documento de arquitectura). |
| PATCH | `/api/v1/notifications/:id/read` | Sesión (destinatario) | Marca una notificación como leída. |
| GET | `/api/v1/subscriptions` | Sesión | Ligas que sigue el usuario. |
| GET | `/api/v1/subscriptions/leagues/:leagueId` | Público | `{ leagueId, followers }`: número de seguidores de una liga. |
| POST | `/api/v1/subscriptions` | Sesión | Sigue una liga (`leagueId`). |
| DELETE | `/api/v1/subscriptions/:leagueId` | Sesión | Deja de seguir la liga. |
| GET | `/health` | Abierto | Salud del servicio (base de datos y Redis). La usan Docker y Render. |
| GET | `/status` | Interno | Versión, tiempo activo, memoria, checks, circuitos (Team) y canales suscritos; lo consulta el panel *Sistema* del gateway. |
| GET | `/metrics` | Abierto | Métricas Prometheus, incluidas `notifications_created_total{type}` y `notification_deliveries_total{channel,status}`. |

En el gateway, `/api/v1/notifications/deliveries` también está restringida a `ADMIN`.

## Eventos

Se consumen de **Redis Pub/Sub**: el canal es el nombre del evento y el mensaje es un sobre JSON (`id`,
`type`, `version`, `source`, `occurredAt`, `requestId`, `data`).

**Publica**: ningún evento.

**Consume**

| Evento (canal) | Lo publica | Qué hace |
|---|---|---|
| `league.created` | League | Avisa a los administradores (rol `ADMIN`) de una liga pendiente de aprobación. |
| `league.reviewed` | League | Avisa al organizador de que su liga fue aprobada, rechazada o suspendida. |
| `user.registered` | Auth | Avisa a los administradores de un usuario nuevo. |
| `fixture.published` | Fixture | Jornada publicada: avisa al organizador y a los seguidores de la liga (correo a los seguidores). |
| `referee.assigned` | Referee | Avisa al árbitro asignado (por su correo) y le envía un correo. |
| `referee.unassigned` | Referee | Avisa al organizador de que un partido quedó sin árbitro disponible. |
| `match.rescheduled` | Fixture | Cambio de horario o de cancha: organizador y seguidores (correo a los seguidores). |
| `match.suspended` | Fixture | Partido suspendido: organizador y seguidores (correo); pide los nombres de los equipos al Team Service. |
| `match.completed` | Live Score | Resultado final (o acta corregida): organizador y seguidores (correo); pide los nombres de los equipos al Team Service. |

## Comunicación con otros servicios

**Llamadas que hace**:

| Destino | Llamada | Para qué | Timeout | Reintentos |
|---|---|---|---|---|
| Team Service | `GET /api/v1/teams?ids=` | Nombres de los equipos para los avisos de suspensión y de resultado. Si falla, el aviso sale igual con «Local» y «Visitante». | 2000 ms | 2 |
| Google Apps Script (externo) | `POST` a `MAIL_RELAY_URL` con `{ secret, to, subject, body }` | Enviar el correo desde Gmail. El cuerpo incluye el enlace «Ver en SportsLeague» con `WEB_URL`. | 15 s | 0 |
| Servicio push del navegador (externo: FCM, Mozilla, Windows…) | `POST` cifrado al `endpoint` de cada suscripción (librería `web-push`) | Entregar la notificación push `{ title, body, link }`. | 10 s | 0 |

La llamada al Team Service usa el `ServiceClient` del chassis: reintentos con backoff exponencial (150 ms,
300 ms… con variación aleatoria; solo en lecturas) y circuit breaker (se abre tras 5 fallos seguidos,
rechaza durante 15 s y luego deja pasar una llamada de prueba).

**Llamadas que recibe**: ningún otro microservicio lo llama por REST; solo el API Gateway.

## Base de datos

Base propia **`notification_db`** en PostgreSQL 16 (usuario `notification_user` en Docker Compose).
Ningún otro servicio puede conectarse a ella.

| Tabla | Columnas clave | Índices y restricciones |
|---|---|---|
| `notifications` | `id` (UUID, PK), `user_id`, `email`, `role`, `type`, `title`, `body`, `link`, `read`, `event_id`, `dedupe_key`, `created_at` | Único `notifications_dedupe_key_key` (idempotencia); índices `notifications_user_id_idx`, `notifications_email_idx` y `notifications_role_idx` |
| `subscriptions` | `id` (UUID, PK), `user_id`, `email`, `league_id`, `created_at` | Único `subscriptions_user_id_league_id_key` (`user_id`, `league_id`); índice `subscriptions_league_id_idx` |
| `preferences` | `user_id` (PK), `email_enabled`, `push_enabled`, `updated_at` | — |
| `deliveries` | `id` (UUID, PK), `channel` (`EMAIL` o `PUSH`), `recipient`, `subject`, `status` (`SENT`, `FAILED` o `SIMULATED`), `created_at` | Índice `deliveries_created_at_idx` |
| `push_subscriptions` | `id` (UUID, PK), `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at` | Único `push_subscriptions_endpoint_key`; índice `push_subscriptions_user_id_idx` |

Las migraciones están en `prisma/migrations/` (`20261011000000_init` y `20261018000000_push_subscriptions`) y se aplican solas al arrancar con
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
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists --no-owner --no-privileges notification_db > services/notification-service/database/respaldo.sql
```

En Windows ejecútalo desde Git Bash o `cmd`: la redirección `>` de PowerShell 5.1 cambia la codificación
del archivo.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4008` | Puerto HTTP. |
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL (Prisma). Docker Compose: `postgresql://notification_user:sl_dev_pass@postgres:5432/notification_db`. |
| `DATABASE_NAME` | No | — | La lee el `CMD` del Dockerfile: si está definida, sustituye el nombre de la base de `DATABASE_URL` (Render Free usa una sola PostgreSQL con una base por servicio: `notification_db?connection_limit=5`). |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis para eventos y trazas. Docker Compose: `redis://redis:6379`. |
| `INTERNAL_API_TOKEN` | Sí | — | Token compartido con el gateway y los demás servicios; también se envía en las llamadas al Team Service. Sin él, todas las rutas salvo `/health` y `/metrics` responden `401`. |
| `TEAM_SERVICE_URL` | No | `http://localhost:4003` | URL del Team Service (acepta `http://host:puerto` o solo `host:puerto`). Docker Compose: `http://team-service:4003`. |
| `MAIL_RELAY_URL` | No | vacía | URL `/exec` del Google Apps Script. Vacía = correos simulados. |
| `MAIL_RELAY_SECRET` | No (sí si hay `MAIL_RELAY_URL`) | vacía | Clave compartida; debe coincidir con `SECRETO` del script. |
| `MAIL_SKIP_DOMAINS` | No | `demo.com,example.com,sportsleague.com` | Dominios que nunca reciben correo real (cuentas de demostración), separados por comas. |
| `WEB_URL` | No | `http://localhost:3000` | URL de la web para el enlace «Ver en SportsLeague» de los correos. Render: `https://sportsleague-cyan.vercel.app`. |
| `VAPID_PUBLIC_KEY` | No | vacía | Clave pública VAPID para Web Push (`npx web-push generate-vapid-keys`). Vacía = push simulado. |
| `VAPID_PRIVATE_KEY` | No (sí si hay `VAPID_PUBLIC_KEY`) | vacía | Clave privada VAPID del mismo par. Es secreta: solo en las variables de entorno. |
| `VAPID_SUBJECT` | No | `mailto:admin@sportsleague.com` | Contacto que se envía a los servicios push (formato `mailto:` o `https:`). |
| `LEAGUE_TIMEZONE` | No | `America/Bogota` | Zona horaria con la que las plantillas muestran la fecha y hora de los partidos. |
| `LOG_LEVEL` | No | `info` | Nivel mínimo de log: `debug`, `info`, `warn` o `error`. |
| `TRUST_PROXY` | No | `loopback, linklocal, uniquelocal` | Valor de `trust proxy` de Express (de qué proxies se acepta `X-Forwarded-For`). |
| `SERVICE_NAME` | No | `notification-service` | Nombre del servicio en logs y métricas. |
| `SERVICE_VERSION` | No | `1.0.0` | Versión que informa `/status`. |
| `TRACE_ENABLED` | No | activado | `false` desactiva la copia en Redis Streams de los logs que llevan `matchId` (trazabilidad por partido). |

`.env.example` también incluye `LEAGUE_UTC_OFFSET`, común a la plataforma; este servicio no la usa.

## Despliegue

- **Imagen Docker**: `ghcr.io/javierlydiaz21-bit/sportsleague-app-notification-service`, publicada por
  GitHub Actions desde el repositorio principal (`.github/workflows/notification-service.yml`, que llama a
  `service-pipeline.yml`): `npm ci` → ESLint → Jest con cobertura → `npm run build` → imagen en GHCR con
  las etiquetas `:<sha>` y `:latest` (rama `main`) o `:develop` → despliegue en Render con el *deploy hook*
  del secreto `RENDER_DEPLOY_HOOK_NOTIFICATION`.
- **Render Free** (blueprint `render-free.yaml`): https://sportsleague-jd-notification.onrender.com. Usa
  la PostgreSQL gratuita compartida `sportsleague-jd-db` con su propia base (`DATABASE_NAME`) y el Key
  Value `sportsleague-jd-redis`. `MAIL_RELAY_URL` y `MAIL_RELAY_SECRET` se escriben en el panel de Render
  (*Environment*). Es un servicio web público, pero sin `x-internal-token` solo responde `/health` y
  `/metrics`.
- **Healthcheck**: `GET /health` (lo usan Render para los *rolling updates* y el `HEALTHCHECK` del Dockerfile).
- **Plan gratuito**: el servicio se duerme tras 15 minutos sin tráfico y tarda unos 30–60 s en despertar;
  el despertador del API Gateway (`WAKE_SERVICES`) lo despierta cuando alguien abre la web. Un servicio
  dormido no recibe los eventos de Redis. La PostgreSQL gratuita caduca a los 30 días de crearla.

## Autores

Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.
Universidad Cooperativa de Colombia, Montería, 2026.
