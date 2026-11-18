# Evidencias de pruebas · SportsLeague

Cada uno de los 10 microservicios tiene pruebas unitarias con dobles de Jest (`jest.fn()`,
`jest.mock()`) y una prueba de integración. Los datos salen del CI de GitHub Actions del 18/11/2026
en el repositorio principal, sobre la rama `develop` (commit `99243a2`): el código del release, que
luego se sincroniza a cada repositorio de servicio.

## Resumen por microservicio

| Microservicio | Prueba unitaria 1 | Prueba unitaria 2 | Prueba de integración | Cobertura con chassis | Cobertura sin chassis |
|---|---|---|---|---|---|
| api-gateway | «consulta el /health de todos los servicios como mucho una vez por intervalo» | «no retrasa ni rompe la petición si un servicio no responde» | `gateway.integration.spec.ts`: la cadena completa del gateway frente a los 9 servicios simulados por HTTP (enrutamiento, JWT, roles, CORS, rate limiting con 429, 503 y `/metrics`) | 57,46 % | 88,63 % |
| auth-service | «suspender a un usuario revoca sus sesiones, lo marca en Redis para el gateway y publica user.updated» | «el administrador no puede cambiar su propio rol o estado» | `auth.integration.spec.ts`: registro, inicio de sesión, rotación del refresh token con CSRF, detección de reutilización y suspensión por el administrador, sobre PostgreSQL | 64,39 % | 84,10 % |
| league-service | «crea la liga pendiente de aprobación y avisa con league.created» | «el administrador aprueba la liga y se publica league.reviewed» | `league.integration.spec.ts`: crea una liga y su temporada en PostgreSQL y las lee por HTTP; 401 sin token interno, 400 con fechas inválidas y 403 a otro organizador | 59,22 % | 69,46 % |
| team-service | «valida la elegibilidad automáticamente al fichar un jugador» | «deja al jugador pendiente cuando no se puede consultar la categoría» | `team.integration.spec.ts`: registra un equipo con los datos de League Service, ficha jugadores y calcula su elegibilidad; 404, 409 y 400; con League Service caído usa la caché | 68,14 % | 70,59 % |
| fixture-service | «genera el calendario completo de la categoría en borrador» | «actualiza el estado del partido de forma idempotente al recibir match.completed» | `fixture.integration.spec.ts`: genera el calendario en borrador, lo publica (un `fixture.published` por jornada), reprograma un partido y sigue `match.started` y `match.completed` | 72,07 % | 84,42 % |
| referee-service | «asigna automáticamente al árbitro de la misma zona y publica referee.assigned» | «avisa con referee.unassigned cuando nadie está disponible» | `referee.integration.spec.ts`: registra árbitros, los asigna por zona al recibir `fixture.published` sin duplicar, avisa si nadie está disponible y busca reemplazo cuando el árbitro rechaza | 60,04 % | 68,86 % |
| live-score-service | «el árbitro asignado registra un gol, se calcula el marcador y se publica match.event» | «al finalizar publica el acta (match.completed) con el marcador y la versión» | `live.integration.spec.ts`: el árbitro inicia el partido y registra un gol que un espectador recibe por WebSocket; acta con `match.completed` y corrección versionada | 74,43 % | 93,84 % |
| statistics-service | «recalcula la tabla al recibir match.completed y avisa con standings.updated» | «procesar el mismo evento dos veces no duplica efectos (idempotencia)» | `statistics.integration.spec.ts`: con `match.completed` recalcula tabla, goleadores y tarjetas; acta repetida, corrección y conciliación con Live Score Service | 74,64 % | 93,42 % |
| notification-service | «notifica al organizador y a los aficionados de la liga, y registra los envíos» | «respeta las preferencias: sin correo ni push para quien los desactivó» | `notification.integration.spec.ts`: suscripciones y preferencias; `league.created` y `match.completed` generan avisos y correos por el relé simulado; idempotencia y relé caído (FAILED) | 70,43 % | 85,53 % |
| analytics-service | «extrae de las réplicas, carga las tablas en una sola transacción y marca la corrida SUCCESS» | «si una réplica no responde registra la corrida FAILED y no toca las tablas analíticas» | `analytics.integration.spec.ts`: ETL sobre réplicas de solo lectura en PostgreSQL (KPIs, asistencia y tendencia); una segunda corrida no duplica filas y una réplica caída deja la corrida FAILED | 60,32 % | 91,26 % |

**Cómo leer la cobertura.** Las dos columnas son cobertura de líneas.

- **Con chassis**: todo `src/` salvo `main.ts` y las pruebas, incluido `src/chassis/`, el código
  común que se copia en cada servicio. Es la cifra que controla el umbral del 50 %.
- **Sin chassis**: solo el código propio del servicio, sin `src/chassis/`.

Cada servicio usa solo una parte del chassis, que es la misma copia en los 10. Por eso la cifra con
chassis es más baja.

## Dónde está cada prueba unitaria

Las dos pruebas unitarias de cada servicio están en el mismo archivo, dentro de `src/`:

| Microservicio | Archivo | Qué se simula con Jest |
|---|---|---|
| api-gateway | `src/gateway/wake.spec.ts` | La consulta a `/health` y el `next()` del middleware (`jest.fn()`) |
| auth-service | `src/users/users.service.spec.ts` | Prisma, Redis y el bus de eventos (`jest.fn()`) |
| league-service | `src/leagues/leagues.service.spec.ts` | Prisma (`jest.fn()`); bus en memoria |
| team-service | `src/teams/teams.service.spec.ts` | Prisma y el cliente de League Service (`jest.fn()`) |
| fixture-service | `src/fixtures/fixtures.service.spec.ts` | Prisma y los clientes de League y Team Service (`jest.fn()`); bus en memoria |
| referee-service | `src/assignments/referees.service.spec.ts` | Prisma (`jest.fn()`); bus en memoria |
| live-score-service | `src/live/live.service.spec.ts` | Prisma, la caché, el cliente de Referee Service y el contador de espectadores (`jest.fn()`); bus en memoria |
| statistics-service | `src/statistics/statistics.service.spec.ts` | Prisma, la caché y el cliente de League Service (`jest.fn()`); bus en memoria |
| notification-service | `src/notifications/notifications.service.spec.ts` | Prisma, el envío de correo y el de push (`jest.fn()`); bus en memoria |
| analytics-service | `src/etl/etl.service.spec.ts` | La conexión a las réplicas (`jest.mock('pg')`), Prisma y el candado de Redis (`jest.fn()`) |

El bus en memoria es `InMemoryEventBus`, del chassis: guarda los eventos publicados para que la
prueba los compruebe.

Las pruebas de integración están en `test/integration/`. Usan PostgreSQL real, salvo el api-gateway,
que no tiene base de datos. Solo simulan Redis y, con servidores HTTP locales, los microservicios de
los que depende cada uno, de modo que las llamadas pasan por el cliente HTTP real.

## Resultados del CI

| Microservicio | Pruebas | Ejecución en GitHub Actions |
|---|---|---|
| api-gateway | 54 | [sportsleague · api-gateway](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095894) |
| auth-service | 34 | [sportsleague · auth-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095725) |
| league-service | 27 | [sportsleague · league-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095362) |
| team-service | 28 | [sportsleague · team-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095467) |
| fixture-service | 46 | [sportsleague · fixture-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095406) |
| referee-service | 27 | [sportsleague · referee-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095370) |
| live-score-service | 29 | [sportsleague · live-score-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095906) |
| statistics-service | 28 | [sportsleague · statistics-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095586) |
| notification-service | 38 (37 pasan y 1 opcional se omite) | [sportsleague · notification-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095592) |
| analytics-service | 32 | [sportsleague · analytics-service](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095365) |
| **Total** | **343 (342 pasan y 1 se omite)** | |

En cada ejecución, el informe de cobertura queda como artefacto `coverage-<servicio>`.

Los totales incluyen las pruebas del chassis, que corren en los 10 servicios: la documentación
OpenAPI (`/docs` y `/openapi.json`), `/metrics` con y sin `METRICS_TOKEN` y el log por solicitud
con la IP del cliente.

## Cómo ejecutarlas

Desde la carpeta de un servicio (`services/<servicio>`):

```bash
npm ci
npx prisma generate        # todos menos api-gateway, que no tiene base de datos
npm run test:unit          # unitarias: src/**/*.spec.ts
npm run test:integration   # integración: test/**/*.spec.ts
npm test                   # todas
npm run test:cov           # todas, con el informe de cobertura y el umbral del 50 %
```

Las pruebas de integración usan la PostgreSQL de Docker Compose del repositorio principal
(`docker compose up -d postgres`). La URL se toma de `TEST_DATABASE_URL`; por defecto es
`postgresql://postgres:postgres@localhost:5440/<base del servicio>?schema=pruebas`. Cada ejecución
crea su propio esquema (`pruebas_<sufijo aleatorio>`), aplica las migraciones y lo borra al terminar.
Se niega a correr si la URL no indica un esquema propio, para no tocar los datos de desarrollo. En
GitHub Actions corren contra un contenedor `postgres:16-alpine`.

**Umbral de cobertura.** El `package.json` de cada servicio define
`coverageThreshold: { global: { lines: 50 } }`. El CI ejecuta `npm test -- --ci --coverage`: si la
cobertura de líneas baja del 50 %, Jest termina con error y el job falla. Comprobado con
league-service: solo con las pruebas unitarias cubre el 27,9 %, Jest responde «coverage threshold
for lines (50%) not met» y termina con código 1.

**Prueba opcional de correo real.** `notification-service` tiene además
`test/integration/real-mail.integration.spec.ts`, que envía un correo de verdad por el Google Apps
Script que usa producción. Solo corre si se definen `MAIL_RELAY_URL`, `MAIL_RELAY_SECRET` y
`CORREO_REAL_PARA` (la dirección que lo recibe). Sin esas variables se omite: es la prueba que el CI
cuenta como omitida. Para correrla:

```powershell
cd services/notification-service
$env:MAIL_RELAY_URL = 'https://script.google.com/macros/s/<id>/exec'
$env:MAIL_RELAY_SECRET = '<la clave SECRETO del script>'
$env:CORREO_REAL_PARA = 'tu-correo@gmail.com'
npx jest real-mail
```
