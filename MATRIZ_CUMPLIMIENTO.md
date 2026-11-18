# Matriz de cumplimiento · SportsLeague

Requerimientos asignados a cada microservicio y su cumplimiento (guía del Momento 3, A.1).

## De dónde salen los requerimientos

Los requerimientos salen de los documentos de arquitectura del equipo:

- **Momento 1**: «SPORTSLEAGUE — Diseño Arquitectónico y Estrategia DevOps del Sistema».
  - Secciones 2.1 a 2.8: un microservicio por sección, con su responsabilidad, endpoints y eventos.
  - Sección 5: API Gateway.
  - Sección 10: seguridad.
- **Momento 2**: «SportsLeague — Arquitectura plataforma tecnológicas, Momento 2», tabla «Microservicios y
  responsabilidades». Agrega Auth y API Gateway, que el Momento 1 no define como microservicios.

Ninguno de los dos numera sus requerimientos. Cada fila de esta matriz es una capacidad que esos
documentos piden, con su sección de origen; la numeración (TEAM-01, LEAGUE-01…) es de esta matriz.

**Cuándo cuenta como cumplido.** Solo si se puede señalar el endpoint, el evento o la pantalla que lo
implementa y, cuando existe, la prueba automatizada que lo verifica. Los endpoints se escriben con el
prefijo real `/api/v1`. El documento los escribe como `/api/...`.

Las pruebas citadas están en el repositorio de cada servicio:

- **unitaria**: `src/**/*.spec.ts`;
- **integración**: `test/integration/*.integration.spec.ts`, contra PostgreSQL real.

El detalle está en [EVIDENCIAS_PRUEBAS.md](EVIDENCIAS_PRUEBAS.md).

## Resumen

| Microservicio | Requerimientos asignados | Requerimientos cumplidos | % cumplimiento | Elementos técnicos |
|---|---|---|---|---|
| Team | 7 | 7 | 100 % | API REST, validación automática de elegibilidad, cliente REST hacia League con *circuit breaker* y caché |
| League | 6 | 6 | 100 % | API REST, flujo de aprobación de ligas, reglamentos por deporte, eventos `league.*` y `rules.updated` |
| Fixture | 9 | 9 | 100 % | Generador de calendarios (*round robin* con restricciones), clientes REST hacia League y Team, evento `fixture.published` |
| Referee | 6 | 6 | 100 % | Asignación automática por zona, categoría y disponibilidad; consumidor de `fixture.published` |
| Live Score | 7 | 7 | 100 % | WebSocket (Socket.IO), actas versionadas, eventos `match.*` |
| Statistics | 6 | 6 | 100 % | Recálculo idempotente por eventos, desempates, caché de la tabla en Redis |
| Notification | 8 | 8 | 100 % | Correo real (Gmail vía Google Apps Script), push del navegador (Web Push con VAPID), consumidor de 9 eventos |
| Analytics | 4 | 4 (1 con desviación justificada) | 100 % | ETL periódico sobre las bases de Fixture, Live Score y Statistics con conexiones en modo de solo lectura (en local, además, con un usuario de solo lectura), KPIs |
| Auth | 6 | 6 | 100 % | JWT, refresh tokens rotativos, bcrypt, CSRF, roles |
| API Gateway | 7 | 7 | 100 % | Proxy inverso, JWT, rate limiting en Redis, CORS, logs con IP del cliente, trazas por `match_id` |
| **Total** | **66** | **66** | **100 %** | — |

**ANA-01** cuenta como cumplido con una desviación justificada: en producción no hay réplicas de solo
lectura. La explicación está en la sección de Analytics.

## Team Service

Momento 1, §2.1; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| TEAM-01 | Registrar equipos (§2.1) | `POST /api/v1/teams`; pantalla *Mis ligas → Equipos* (`/panel/ligas/[id]`) | Integración: «registra el equipo con los datos de la categoría que devuelve League Service». Unitaria: «solo el organizador dueño de la liga registra equipos» | Cumplido |
| TEAM-02 | Consultar un equipo y su plantilla (§2.1) | `GET /api/v1/teams/:id`, `GET /api/v1/teams/:id/players`; pantalla `/equipos/[id]` | Integración: «GET /teams/:id/players muestra el documento de identidad solo al organizador» | Cumplido |
| TEAM-03 | Fichar jugadores en la plantilla (§2.1) | `POST /api/v1/teams/:id/players` (y `/bulk`) | Integración: «ficha jugadores y calcula su elegibilidad con el rango de edad de la categoría» | Cumplido |
| TEAM-04 | Validar automáticamente la elegibilidad por edad mínima y máxima de la categoría (§2.1) | Al fichar; `PUT /api/v1/players/:id/eligibility` revalida | Unitaria: «valida la elegibilidad automáticamente al fichar un jugador»; `eligibility.spec.ts` | Cumplido |
| TEAM-05 | Administrar la documentación de fichaje (§2.1) | Campos `documentId` y `registrationDocUrl` (enlace al documento escaneado) en `POST/PATCH /api/v1/players`, visibles solo para el organizador o el administrador | Integración: «GET /teams/:id/players muestra el documento de identidad solo al organizador» | Cumplido |
| TEAM-06 | Ser consultado por Fixture vía REST para validar los equipos participantes (§2.1) | `GET /api/v1/teams?categoryId=`, que usa el cliente de Team en Fixture | Integración de Fixture: «genera el calendario en borrador…» (Team simulado por HTTP, a través del cliente real) | Cumplido |
| TEAM-07 | Número de camiseta único por equipo (Momento 2) | Restricción única `(team_id, jersey_number)` → `409` | Integración: «responde 409 si el número de camiseta ya está ocupado en el equipo» | Cumplido |

## League Service

Momento 1, §2.2 y §3.2; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| LEAGUE-01 | Administrar ligas (§2.2) | `POST/GET/PATCH/DELETE /api/v1/leagues`; pantallas `/panel/ligas/nueva`, `/ligas`, `/ligas/[id]` | Integración: «crea la liga, le agrega una temporada y GET /leagues/:id la devuelve con ella». Unitaria: «crea la liga pendiente de aprobación y avisa con league.created» | Cumplido |
| LEAGUE-02 | Aprobación de ligas (Momento 2) | `PATCH /api/v1/leagues/:id/review` (aprobar, rechazar o suspender); evento `league.reviewed`; pantalla *Administración → Ligas* | Unitaria: «el administrador aprueba la liga y se publica league.reviewed» | Cumplido |
| LEAGUE-03 | Temporadas con fecha de inicio anterior a la de fin (§2.2, §3.2) | `POST /api/v1/leagues/:id/seasons` | Integración: «responde 400 si la fecha de inicio no es anterior a la de fin y no guarda la temporada» | Cumplido |
| LEAGUE-04 | Categorías con rango de edad (§2.2, §3.2) | `POST /api/v1/seasons/:id/categories` (ruta del documento) y `POST /api/v1/leagues/:id/categories` | Unitaria: «valida rangos de edad y fechas de temporada» | Cumplido |
| LEAGUE-05 | Reglamento por categoría: puntos por victoria o empate y criterios de desempate, según el deporte (§2.2; Momento 2) | `GET/PUT /api/v1/categories/:id/rules`; evento `rules.updated` | Unitaria: «define reglamentos por defecto coherentes con cada deporte»; «impide que otro organizador agregue categorías y aplica el reglamento por defecto» | Cumplido |
| LEAGUE-06 | Fuente de verdad consultada vía REST: por Fixture (estructura de la temporada) y por Statistics (reglamento) (§2.2) | `GET /api/v1/internal/seasons/:id/structure` y `GET /api/v1/categories/:id/rules` | Integraciones de Fixture y de Statistics (League simulado por HTTP) | Cumplido |

## Fixture Service

Momento 1, §2.3 y §3.3; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| FIX-01 | Generar automáticamente el calendario completo de una temporada (§2.3) | `POST /api/v1/seasons/:seasonId/fixtures/generate`; pantalla *Mis ligas → Calendario* | Unitaria: «genera el calendario completo de la categoría en borrador». Integración: «genera el calendario en borrador: todos contra todos…» | Cumplido |
| FIX-02 | Considerar la disponibilidad de canchas (§2.3) | Días y horario de cada cancha (`availableDays`, `openTime`, `closeTime`) | Unitaria (`scheduler.spec.ts`): «genera franjas según el horario de la cancha» | Cumplido |
| FIX-03 | Descanso mínimo entre partidos consecutivos de un mismo equipo (§2.3) | `minRestDays` al generar | Unitaria: «respeta días de juego, descanso mínimo y no repite cancha/hora» | Cumplido |
| FIX-04 | Equilibrio de partidos como local y visitante (§2.3) | *Round robin* con localía equilibrada | Unitaria: «equilibra la localía con %i equipos» (4, 5, 6, 8 y 10 equipos) | Cumplido |
| FIX-05 | Consultar el calendario y un partido (§2.3) | `GET /api/v1/fixtures/:id` (acepta el id de una temporada, como en el documento), `GET /api/v1/matches/:id`; pantallas `/ligas/[id]` y `/partidos/[id]` | Integración: «el borrador solo lo ve el organizador; el calendario público sale vacío» | Cumplido |
| FIX-06 | Cambiar la cancha de un partido (§2.3) | `PUT /api/v1/matches/:id/venue`; evento `match.rescheduled` | Integración: «suspende un partido y lo reprograma en otra cancha…»; «responde 400 si la cancha nueva no es de la liga…» | Cumplido |
| FIX-07 | Consultar League y Team vía REST durante la generación (§2.3) | Clientes REST con *timeout*, reintentos y *circuit breaker* | Integración: League y Team simulados por HTTP | Cumplido |
| FIX-08 | Publicar `fixture.published` por cada jornada confirmada (§2.3) | `POST /api/v1/fixtures/:id/publish` | Integración: «publica el calendario y emite un fixture.published por jornada con equipos y canchas» | Cumplido |
| FIX-09 | Estado del partido: programado, en curso, finalizado o suspendido (§3.3) | `PATCH /api/v1/matches/:id/status`; consume `match.started` y `match.completed` | Unitaria: «actualiza el estado del partido de forma idempotente al recibir match.completed». Integración: «actualiza el estado con match.started y match.completed…, sin retroceder» | Cumplido |

La «Visión general» del Momento 1 dice que el calendario respeta la disponibilidad de los árbitros. La
sección del servicio (§2.3) no lo pide. En el sistema esa disponibilidad se aplica en Referee, al
asignar (REF-03).

## Referee Service

Momento 1, §2.4 y §3.4.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| REF-01 | Registro de árbitros (§2.4) | `POST /api/v1/referees`; pantalla *Mis ligas → Árbitros* | Integración: «registra árbitros con su zona y disponibilidad en PostgreSQL» | Cumplido |
| REF-02 | Disponibilidad horaria declarada (§2.4) | `PUT /api/v1/referees/:id/availability` | Integración: «responde 409 con un correo repetido y 400 con una franja horaria invertida…» | Cumplido |
| REF-03 | Asignación automática según la categoría del partido y la zona del árbitro, al consumir `fixture.published` (§2.4) | Consumidor de `fixture.published`; evento `referee.assigned` (o `referee.unassigned` si nadie está disponible) | Unitaria: «asigna automáticamente al árbitro de la misma zona y publica referee.assigned»; `matching.spec.ts`: «descarta árbitros sin disponibilidad, de otra liga, no certificados o inactivos» | Cumplido |
| REF-04 | Consultar las asignaciones de un árbitro (§2.4) | `GET /api/v1/referees/:id/assignments`; pantalla `/panel/arbitro` | Integración: «el árbitro ve su partido y lo confirma…» | Cumplido |
| REF-05 | Confirmar la asignación (§2.4) | `PUT /api/v1/assignments/:id/confirm`; al rechazar se busca un reemplazo | Integración: «el árbitro ve su partido y lo confirma; un aficionado no puede confirmar por él»; «si el árbitro rechaza el partido se asigna un reemplazo disponible» | Cumplido |
| REF-06 | Sin asignaciones duplicadas por partido (§3.4) | Asignación idempotente por partido | Unitaria: «no asigna dos veces el mismo partido si el evento se repite (idempotencia)» | Cumplido |

## Live Score Service

Momento 1, §2.5 y §10.2; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| LIVE-01 | Registrar en tiempo real goles, tarjetas amarillas o rojas y sustituciones (§2.5) | `POST /api/v1/matches/:id/events`; pantalla *Control en vivo* (`/panel/partidos/[id]`) | Unitaria: «el árbitro asignado registra un gol, se calcula el marcador y se publica match.event»; `score.spec.ts` | Cumplido |
| LIVE-02 | Actualizar al instante el marcador de los espectadores por WebSocket, con canal por partido (§2.5) | Socket.IO en `/live` y su alias `/live-scores`, mensaje `subscribe { matchId }`; pantalla `/partidos/[id]` | Integración: «un espectador conectado por WebSocket recibe el gol con el marcador apenas el árbitro lo registra» | Cumplido |
| LIVE-03 | Consultar el estado en vivo de un partido (§2.5) | `GET /api/v1/matches/:id/live` | — | Cumplido |
| LIVE-04 | Finalizar el partido y publicar `match.completed` (§2.5) | `POST /api/v1/matches/:id/complete` | Integración: «al finalizar guarda el acta y publica match.completed con el marcador calculado de los eventos» | Cumplido |
| LIVE-05 | Publicar `match.event` por cada evento registrado (§2.5) | Evento `match.event` | Unitaria: «el árbitro asignado registra un gol… y se publica match.event» | Cumplido |
| LIVE-06 | Solo el árbitro asignado registra eventos de sus partidos (§10.2) | Consulta interna a Referee (`/api/v1/internal/assignments/check`) | Unitaria: «un árbitro no asignado no puede modificar el marcador». Integración: «rechaza un jugador de otro equipo (400) y a un árbitro no asignado (403)…» | Cumplido |
| LIVE-07 | Actas versionadas (Momento 2) | Cada corrección republica `match.completed` con versión + 1 | Unitaria: «una corrección posterior al cierre republica el acta con una nueva versión». Integración: «tras el cierre solo el organizador corrige el acta…» | Cumplido |

## Statistics Service

Momento 1, §2.6; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| STAT-01 | Tabla de posiciones (§2.6) | `GET /api/v1/standings/:seasonId`; pantalla `/ligas/[id]` (Posiciones) | Unitaria (`calculator.spec.ts`): «suma puntos según el reglamento e incluye equipos sin partidos» | Cumplido |
| STAT-02 | Ranking de goleadores (§2.6) | `GET /api/v1/top-scorers/:seasonId`; pantalla `/ligas/[id]` (Goleadores) | Unitaria: «ordena el ranking de goleadores» | Cumplido |
| STAT-03 | Tarjetas acumuladas por jugador (§2.6) | `GET /api/v1/players/:id/disciplinary-record`, `GET /api/v1/disciplinary/:seasonId`; pantalla `/ligas/[id]` (Disciplina) | Unitaria: «acumula tarjetas por jugador» | Cumplido |
| STAT-04 | Recalcular de forma inmediata e idempotente al consumir `match.completed` (§2.6) | Consumidor de `match.completed`; evento `standings.updated` | Unitaria: «recalcula la tabla al recibir match.completed…»; «procesar el mismo evento dos veces no duplica efectos (idempotencia)» | Cumplido |
| STAT-05 | Consultar el reglamento de puntuación al League Service (§2.6) | Cliente REST hacia `GET /api/v1/categories/:id/rules` | Integración: «con match.completed guarda el acta y recalcula… con el reglamento de League Service». Unitaria: «si el League Service no responde usa el reglamento estándar» | Cumplido |
| STAT-06 | Criterios de desempate (Momento 2) | Diferencia de gol, goles a favor y enfrentamiento directo, según el reglamento | Unitaria: «desempata por diferencia de gol y luego por goles a favor»; «aplica el enfrentamiento directo…»; «resuelve un triple empate circular…» | Cumplido |

## Notification Service

Momento 1, §2.7; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| NOTI-01 | Avisar los horarios confirmados al consumir `fixture.published` (§2.7) | Consumidor de `fixture.published` | Unitaria (`notifications.service.spec.ts`, con un `fixture.published`): «notifica al organizador y a los aficionados de la liga, y registra los envíos» | Cumplido |
| NOTI-02 | Avisar los cambios de sede de último momento (§2.7) | Consumidor de `match.rescheduled` | Unitaria (`templates.spec.ts`): «distingue cambio de sede y de horario» | Cumplido |
| NOTI-03 | Avisar el resultado final al consumir `match.completed` (§2.7) | Consumidor de `match.completed` | Integración: «match.completed avisa al organizador y a los aficionados, y envía el correo por el relé solo a quien lo tiene activo» | Cumplido |
| NOTI-04 | Consultar las notificaciones de un usuario (§2.7) | `GET /api/v1/notifications/:userId` (ruta del documento) y `GET /api/v1/notifications`; pantalla `/panel/notificaciones` | Integración: «la aficionada ve sus avisos y los marca como leídos; otro usuario no puede tocarlos» | Cumplido |
| NOTI-05 | Preferencias de notificación (§2.7) | `GET/PUT /api/v1/notifications/preferences` | Unitaria: «respeta las preferencias: sin correo ni push para quien los desactivó». Integración: «los aficionados siguen la liga, eligen sus canales…» | Cumplido |
| NOTI-06 | Enviar una notificación de prueba (§2.7) | `POST /api/v1/notifications/test` | — | Cumplido |
| NOTI-07 | Enviar notificaciones push y por correo (§2.7; Momento 2) | Correo con Gmail vía Google Apps Script; push del navegador con Web Push (VAPID) | Unitarias: `mailer.spec.ts`, `push.spec.ts`. Integración: relé de correo simulado por HTTP. Prueba opcional de correo real | Cumplido |
| NOTI-08 | Control de duplicados (Momento 2) | Una notificación por evento y destinatario | Unitaria: «no duplica notificaciones si el mismo evento llega dos veces». Integración: «si el mismo mensaje se entrega dos veces no se duplican avisos ni correos» | Cumplido |

El Momento 1 dice que Notification no necesita una base de datos propia, salvo una tabla opcional de
preferencias. El servicio sí tiene base propia (`notification_db`), para la bandeja de cada usuario, el
control de duplicados y el registro de envíos.

## Analytics Service

Momento 1, §2.8.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| ANA-01 | ETL periódico sobre réplicas de solo lectura de Fixture, Live Score y Statistics (§2.8) | ETL cada `ETL_INTERVAL_MINUTES` (5 por defecto) sobre las bases de Fixture, Live Score y Statistics, con conexiones abiertas en modo de solo lectura (`default_transaction_read_only=on`); `POST /api/v1/analytics/etl/run`; pantalla *Administración → Sistema*. En producción no lee réplicas: ver la nota | Unitaria: «abre las conexiones a las bases de Fixture, Live Score y Statistics en modo de solo lectura»; «extrae de las réplicas, carga las tablas en una sola transacción y marca la corrida SUCCESS». Integración: «las conexiones del ETL a las bases de los otros servicios son de solo lectura: una escritura falla»; «el administrador ejecuta el ETL: extrae de las tres réplicas, transforma y carga la analítica» | **Cumplido con desviación justificada** |
| ANA-02 | Asistencia estimada por partido (§2.8) | `GET /api/v1/analytics/attendance?leagueId=`; la pantalla *Mis ligas → Analítica* la muestra con `GET /api/v1/analytics/leagues/:leagueId` | Integración: «el organizador ve la asistencia estimada (acta o pico en línea)…». Unitaria (`transform.spec.ts`) | Cumplido |
| ANA-03 | Número de partidos suspendidos (§2.8) | `GET /api/v1/analytics/suspended-matches?leagueId=`; también en *Mis ligas → Analítica* (`GET /api/v1/analytics/leagues/:leagueId`) | Integración: «…y los partidos suspendidos de su liga». Unitaria: «lista los partidos suspendidos con su motivo» | Cumplido |
| ANA-04 | Evolución del rendimiento de cada equipo en la temporada (§2.8) | `GET /api/v1/analytics/team-trend/:teamId`; gráfica en `/equipos/[id]` | Integración: «la tendencia del equipo acumula puntos y diferencia de gol partido a partido» | Cumplido |

**Desviación justificada en ANA-01: réplicas de solo lectura.**

- **Qué pide el documento:** que el ETL lea réplicas de solo lectura de las bases operativas, para no
  competir por recursos con ellas.
- **Qué lee en producción:** Render Free no tiene réplicas de lectura. El plan gratuito permite una
  sola instancia de PostgreSQL, que aloja las bases de todos los servicios. En `render-free.yaml`,
  `FIXTURE_REPLICA_URL`, `LIVESCORE_REPLICA_URL` y `STATISTICS_REPLICA_URL` solo dan el nombre de la
  base (`fixture_db`, `livescore_db`, `statistics_db`). Con eso, Analytics se conecta a las bases
  operativas de la misma instancia con las credenciales de su propia `DATABASE_URL`: el usuario de la
  instancia, el mismo que usan todos los servicios.
- **Qué protección hay:** Analytics abre cada conexión a esas bases **en modo de solo lectura**: añade
  `-c default_transaction_read_only=on` a las opciones de la conexión (`withReadOnlyTransactions` en
  `replica-url.ts`), y cualquier escritura falla con «cannot execute … in a read-only transaction».
  **No es un usuario con permisos restringidos.** El usuario de la instancia tiene permisos de
  escritura y podría desactivar esa opción desde la propia sesión, así que protege contra escrituras
  por error del ETL, no contra un uso malintencionado de esas credenciales.
- **Por qué:** tener réplicas, una instancia por servicio o un usuario de solo lectura por servicio
  exige planes de pago de Render, y el despliegue del proyecto es gratuito. `render.yaml`, el blueprint
  de pago que queda como referencia, deja `*_REPLICA_URL` para apuntar a réplicas reales.
- **En local sí se cumple tal como dice el documento:** con Docker Compose, Analytics lee con el
  usuario `analytics_ro`, que solo tiene permiso `SELECT` y `default_transaction_read_only = on`
  (`infra/postgres/init/01-databases.sh`), además de la opción de la conexión.

## Auth Service

Momento 1, §5.2, §10.1, §10.3 y §10.6; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| AUTH-01 | Registro de cuentas (Momento 2) | `POST /api/v1/auth/register`; evento `user.registered`; pantalla `/registro` | Integración: «registra a una organizadora: contraseña con bcrypt, refresh token solo como hash, cookie httpOnly y user.registered» | Cumplido |
| AUTH-02 | Inicio de sesión con JWT y refresh token (§5.2, §10.1) | `POST /api/v1/auth/login`; pantalla `/login` | Integración: «inicia sesión con la contraseña correcta y responde lo mismo a una contraseña errónea que a un correo inexistente» | Cumplido |
| AUTH-03 | Renovar el access token con refresh tokens rotativos (§10.1; Momento 2) | `POST /api/v1/auth/refresh` | Integración: «rota el refresh token…»; «si reaparece un refresh token ya rotado (posible robo) cierra todas las sesiones del usuario» | Cumplido |
| AUTH-04 | Contraseñas con bcrypt (§10.3) | Hash bcrypt al registrar y al cambiar la contraseña | Integración: «registra a una organizadora: contraseña con bcrypt…» | Cumplido |
| AUTH-05 | Protección CSRF: cookie SameSite para el refresh token y token anti-CSRF (§10.6) | Cookie `httpOnly` con `SameSite` y cabecera `x-csrf-token` en `/auth/refresh` | Integración: «rota el refresh token: sin el token CSRF responde 403…» | Cumplido |
| AUTH-06 | Roles (Momento 2) | `ADMIN`, `ORGANIZER`, `REFEREE` y `SPECTATOR` en el JWT; `PATCH /api/v1/users/:id`; pantalla *Administración → Usuarios* | Unitaria: «suspender a un usuario revoca sus sesiones…»; «el administrador no puede cambiar su propio rol o estado» | Cumplido |

## API Gateway

Momento 1, §5 y §10.7; Momento 2.

| ID | Requerimiento (fuente) | Implementación | Prueba | Estado |
|---|---|---|---|---|
| GW-01 | Punto de entrada único que enruta cada petición al microservicio correcto según el path (§5, §5.1) | Tabla de enrutamiento de `/api/v1/*` | Integración: «enruta cada lectura pública a su microservicio con el token interno y el mismo x-request-id»; `routes.spec.ts` | Cumplido |
| GW-02 | Validar firma y expiración del JWT y responder `401` sin llegar a los servicios (§5.1, §5.2) | Middleware de autenticación | Integración: «…sin sesión responde 401 sin llegar al servicio»; «…rechaza tokens falsificados o vencidos» | Cumplido |
| GW-03 | Rate limiting por cliente o IP, más estricto en escritura (§5.1, §5.3) | Niveles `auth`, `write` y `read` en Redis | Integración: «rate limiting: el cuarto intento de inicio de sesión en la ventana responde 429 con Retry-After»; `routes.spec.ts`: «clasifica el nivel de rate limiting» | Cumplido |
| GW-04 | Registrar en cada petición la IP del cliente, fecha y hora, endpoint, método, usuario, código y tiempo de respuesta (§5.1, §5.3) | El log `http_request` registra fecha y hora, IP del cliente (`TRUST_PROXY=1` en Render, para que sea la del cliente y no la del proxy), método, ruta, código, duración, usuario y `matchId` | Unitaria (`http-observability.spec.ts`, en los 10 servicios): «registra la IP del cliente, el método, la ruta, el código, la duración y el x-request-id» | Cumplido |
| GW-05 | CORS solo para los dominios autorizados (§10.7) | `CORS_ORIGINS`; responde `403` a otros orígenes | Integración: «CORS: rechaza orígenes no permitidos y responde el preflight del origen de la web» | Cumplido |
| GW-06 | Permisos diferenciados (§5.2) | Rutas de administración solo para `ADMIN`, rutas internas bloqueadas y usuarios suspendidos rechazados | Integración: «bloquea rutas internas (404), las de administración a quien no es ADMIN (403) y a un usuario suspendido (403)» | Cumplido |
| GW-07 | Logs con `match_id` (Momento 2; §9.1) | `matchId` en los logs; traza por partido en `GET /api/v1/system/traces/:matchId`; pantalla *Administración → Trazabilidad* | — | Cumplido |

## Requerimientos transversales

Los aplica el chassis, el código común que se copia en los 10 servicios, así que no se cuentan por
microservicio.

| Requerimiento (fuente) | Implementación |
|---|---|
| Base de datos PostgreSQL por servicio (§1.5, §3) | Una base por servicio (`*_db`) con migraciones de Prisma |
| Migraciones automáticas al desplegar (§8.2, §8.4) | `npx prisma migrate deploy` antes de arrancar cada contenedor |
| Versionado de APIs (§8.5) | Prefijo `/api/v1` |
| *Timeouts*, reintentos y *circuit breaker* (§4.4) | Cliente REST del chassis (`service-client.ts`); estado de los circuitos en `/status` |
| Logs estructurados en JSON (§9.1) | Logger del chassis, con `requestId`, `userId` y `matchId` |
| Métricas (§9.2) | `GET /metrics` en cada servicio; Prometheus y Grafana (`infra/`) |
| *Health checks* (§9.3) | `GET /health` (base de datos y Redis) y `GET /status` |
| Alertas (§9.4) | `infra/prometheus/alerts.yml` |
| Validación de datos y protección contra inyección SQL (§10.4, §10.8) | `class-validator` en todos los DTO; consultas de Prisma parametrizadas |
