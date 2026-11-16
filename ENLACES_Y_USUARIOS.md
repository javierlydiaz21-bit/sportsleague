# Enlaces y usuarios · SportsLeague

Enlaces de la plataforma desplegada, documentación de la API, repositorios y cuentas de prueba.

> Los servicios están en el plan gratuito de Render y se duermen tras unos minutos sin uso. La
> primera respuesta puede tardar hasta un minuto; después responden con normalidad.

## Aplicación en producción

| Qué | Enlace |
|---|---|
| Web | https://sportsleague-cyan.vercel.app |
| API Gateway (único punto de entrada HTTP; las rutas van bajo `/api/v1`) | https://sportsleague-jd-gateway.onrender.com |
| Marcador en vivo (WebSocket, Socket.IO, namespace `/live`) | https://sportsleague-jd-live.onrender.com |

## Estado de los microservicios

Cada servicio expone `GET /health`. Responde `200` con el estado de su base de datos y de Redis
(el gateway no tiene base de datos).

| Servicio | Health check |
|---|---|
| api-gateway | https://sportsleague-jd-gateway.onrender.com/health |
| auth-service | https://sportsleague-jd-auth.onrender.com/health |
| league-service | https://sportsleague-jd-league.onrender.com/health |
| team-service | https://sportsleague-jd-team.onrender.com/health |
| fixture-service | https://sportsleague-jd-fixture.onrender.com/health |
| referee-service | https://sportsleague-jd-referee.onrender.com/health |
| live-score-service | https://sportsleague-jd-live.onrender.com/health |
| statistics-service | https://sportsleague-jd-statistics.onrender.com/health |
| notification-service | https://sportsleague-jd-notification.onrender.com/health |
| analytics-service | https://sportsleague-jd-analytics.onrender.com/health |

## Documentación de la API

Cada servicio documenta sus endpoints en la sección **Endpoints principales** de su README: método,
ruta, quién puede usarla y qué hace. Las solicitudes pasan por el API Gateway, que las reenvía según
el prefijo de la ruta. Por ejemplo, `https://sportsleague-jd-gateway.onrender.com/api/v1/leagues`
llega al League Service.

| Servicio | Prefijos en el gateway (`/api/v1/…`) | Documentación |
|---|---|---|
| API Gateway | `/health`, `/status`, `/metrics`, `/system/*` y la tabla de enrutamiento | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-api-gateway#endpoints-principales) |
| Auth | `/auth/*`, `/users/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-auth-service#endpoints-principales) |
| League | `/leagues/*`, `/seasons/*`, `/categories/*`, `/venues/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-league-service#endpoints-principales) |
| Team | `/teams/*`, `/players/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-team-service#endpoints-principales) |
| Fixture | `/fixtures/*`, `/matches/*`, `/seasons/:id/fixtures/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-fixture-service#endpoints-principales) |
| Referee | `/referees/*`, `/assignments/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-referee-service#endpoints-principales) |
| Live Score | `/live/*`, `/matches/:id/events`, `/matches/:id/live`, `/matches/:id/start`, `/matches/:id/complete` y el WebSocket | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-live-score-service#endpoints-principales) |
| Statistics | `/standings/*`, `/top-scorers/*`, `/disciplinary/*`, `/statistics/*`, `/players/:id/disciplinary-record` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-statistics-service#endpoints-principales) |
| Notification | `/notifications/*`, `/subscriptions/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-notification-service#endpoints-principales) |
| Analytics | `/analytics/*` | [Endpoints principales](https://github.com/javierlydiaz21-bit/sportsleague-analytics-service#endpoints-principales) |

`/health`, `/status` y `/metrics` no llevan el prefijo `/api/v1`. Los mismos README están en el
repositorio principal, en `services/<servicio>/README.md`.

## Repositorios

Repositorio principal, donde se trabaja: https://github.com/javierlydiaz21-bit/sportsleague
(microservicios, web, app móvil, infraestructura y CI/CD).

Cada microservicio también está publicado como repositorio independiente, con su historial, su
README, su `.env.example`, su carpeta `database/` y su CI:

| Servicio | Repositorio |
|---|---|
| API Gateway | https://github.com/javierlydiaz21-bit/sportsleague-api-gateway |
| Auth | https://github.com/javierlydiaz21-bit/sportsleague-auth-service |
| League | https://github.com/javierlydiaz21-bit/sportsleague-league-service |
| Team | https://github.com/javierlydiaz21-bit/sportsleague-team-service |
| Fixture | https://github.com/javierlydiaz21-bit/sportsleague-fixture-service |
| Referee | https://github.com/javierlydiaz21-bit/sportsleague-referee-service |
| Live Score | https://github.com/javierlydiaz21-bit/sportsleague-live-score-service |
| Statistics | https://github.com/javierlydiaz21-bit/sportsleague-statistics-service |
| Notification | https://github.com/javierlydiaz21-bit/sportsleague-notification-service |
| Analytics | https://github.com/javierlydiaz21-bit/sportsleague-analytics-service |

## Usuarios de prueba

Las cuentas de demostración las crea `scripts/seed-demo.mjs`. En producción ya están cargadas, junto
con la liga de demostración «Liga Amateur de Montería».

| Rol | Nombre | Correo | Contraseña | Qué puede hacer |
|---|---|---|---|---|
| Administrador (`ADMIN`) | Administrador | `admin@sportsleague.com` | Se entrega por privado | Aprueba, rechaza o suspende ligas, gestiona usuarios (puede suspenderlos) y revisa *Sistema*, *Eventos* y *Trazabilidad*. |
| Organizador (`ORGANIZER`) | Laura Gómez | `organizador@demo.com` | `Demo12345` | Administra la liga de demostración: temporadas, categorías, canchas, equipos, árbitros y calendario. |
| Organizadora (`ORGANIZER`) | Sofía Martínez | `organizadora@demo.com` | `Demo12345` | Tiene 2 ligas pendientes de aprobación. Sus ligas nuevas quedan pendientes hasta que el administrador las aprueba. |
| Árbitro (`REFEREE`) | Mario Arroyo | `arbitro@demo.com` | `Demo12345` | Confirma o rechaza sus asignaciones e inicia y registra en vivo los partidos que le tocan. |
| Aficionado (`SPECTATOR`) | Camilo Ruiz | `aficionado@demo.com` | `Demo12345` | Sigue ligas, recibe notificaciones y ve los partidos en vivo. |

La contraseña del administrador de producción no es pública y se entrega por privado. La contraseña
`Admin12345` que aparece en el README solo sirve en el entorno local.

## Entorno local

Con la plataforma arrancada en un equipo (`iniciar.bat`, ver el README), se usan las mismas cuentas
de demostración. El administrador local entra con `admin@sportsleague.com` / `Admin12345`.

| URL | Qué es |
|---|---|
| http://localhost:3000 | Web |
| http://localhost:4000 | API Gateway |
| http://localhost:3100 | Grafana (`admin` / `admin`), dashboard «SportsLeague — Jornada en vivo» |
| http://localhost:9090 | Prometheus (métricas y alertas) |

Grafana y Prometheus solo se ejecutan en local: el despliegue gratuito de Render no los incluye.
