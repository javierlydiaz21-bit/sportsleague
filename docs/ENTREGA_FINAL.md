# Entrega final · SportsLeague

Arquitectura y Modelamiento de Software · Universidad Cooperativa de Colombia · Montería, 2026.
Integrantes: Javierly Diaz González, Cinthya María Cogollo Castilla y Andrés Felipe Herrera Pastrana.

SportsLeague es una plataforma de gestión de ligas deportivas amateur (fútbol, básquet y vóley)
construida con 10 microservicios NestJS independientes. Cada uno tiene su propio repositorio, su base
PostgreSQL, su Dockerfile y su pipeline. Se comunican por REST y por eventos en Redis Pub/Sub. La web
está hecha con Next.js.

| Qué | Enlace |
|---|---|
| Web | https://sportsleague-cyan.vercel.app |
| API Gateway (único punto de entrada HTTP, rutas bajo `/api/v1`) | https://sportsleague-jd-gateway.onrender.com |
| Marcador en vivo (WebSocket, Socket.IO, namespace `/live`) | https://sportsleague-jd-live.onrender.com |
| Monitoreo (dashboard público de Grafana Cloud) | https://jademantel3442.grafana.net/public-dashboards/104a3d4644dd4bfaac49d671212d5e66 |
| Repositorio principal | https://github.com/javierlydiaz21-bit/sportsleague |
| Enlaces y usuarios de prueba | [ENLACES_Y_USUARIOS.md](../ENLACES_Y_USUARIOS.md) |

> **Pendiente antes de entregar** (quitar este recuadro al terminar):
>
> - Release de los 10 repositorios de servicio: lleva `/docs`, `/openapi.json` y la protección de
>   `/metrics` a producción, y el `deploy.yml` a los 9 repositorios que aún no lo tienen en `main`.
> - Los 10 trabajos de recolección en Grafana Cloud y la ventana de recolección para las capturas de A.6.
> - Las capturas marcadas `[CAPTURA n: …]`.
> - Parte B: los cinco momentos de la sustentación (ver la nota al inicio de la Parte B).

---

## Parte A · Cumplimiento de los microservicios

### A.1 Matriz de cumplimiento de requerimientos

**Qué pide la guía:** por microservicio, los requerimientos asignados, los cumplidos, el porcentaje
(mínimo 90 %) y los elementos técnicos, con los requerimientos tomados del documento de arquitectura
del equipo.

**Evidencia:** [MATRIZ_CUMPLIMIENTO.md](../MATRIZ_CUMPLIMIENTO.md). Los requerimientos salen de los
documentos de arquitectura del Momento 1 y del Momento 2. Un requerimiento cuenta como cumplido solo si
se puede señalar el endpoint, el evento o la pantalla que lo implementa y, cuando existe, la prueba
automatizada que lo verifica.

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

**Desviación justificada (ANA-01).** El documento pide que el ETL de Analytics lea réplicas de solo
lectura. Render Free no tiene réplicas y permite una sola PostgreSQL, así que en producción Analytics
lee las bases de Fixture, Live Score y Statistics de esa misma instancia. Abre cada conexión en modo de
solo lectura (`default_transaction_read_only=on`): cualquier escritura falla. No es un usuario con
permisos restringidos. En local sí lee con el usuario `analytics_ro`, que solo tiene permiso `SELECT`.
El detalle está en la matriz.

### A.2 Repositorios, bases de datos y documentación de la API

**Qué pide la guía:** un repositorio Git por microservicio con su base de datos (esquema, datos de
ejemplo y respaldo), un README completo, `.env.example` y `.gitignore` sin credenciales, un historial
de commits del equipo y la documentación de la API de cada servicio.

**Un repositorio por microservicio.** Todos son públicos. Se trabaja en el repositorio principal y
cada servicio se publica con su historial (`git subtree split`) en su propio repositorio:

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

**Contenido de cada repositorio:**

| Elemento | Dónde |
|---|---|
| README | Secciones *Responsabilidad*, *Tecnologías*, *Estructura del proyecto*, *Instalación y ejecución*, *Pruebas y calidad*, *Endpoints principales*, *Eventos*, *Comunicación con otros servicios*, *Base de datos*, *Variables de entorno*, *Despliegue* y *Autores* |
| Base de datos | Esquema de Prisma y migraciones en `prisma/`, que se aplican al arrancar (`npx prisma migrate deploy`). En `database/`: `esquema.sql`, `datos-ejemplo.sql` y `respaldo.sql`, generados con `pg_dump` desde una demostración limpia. El API Gateway no tiene base de datos: solo usa Redis |
| `.env.example` y `.gitignore` | Variables con valores de ejemplo; el `.env` real queda fuera del repositorio |
| CI/CD | `.github/workflows/ci.yml` y `.github/workflows/deploy.yml` (ver A.5) |

**Sin credenciales en los repositorios.** En cada ejecución del CI, el job *Escaneo de secretos* pasa
gitleaks por todo el historial. Los valores reales están en las variables de Render y en GitHub Secrets.

**Documentación de la API.** Cada servicio publica `GET /docs` (Swagger UI) y `GET /openapi.json`
(OpenAPI 3), generados con `@nestjs/swagger` a partir de los controladores y los DTO. En el gateway se
declara el esquema Bearer (JWT). Las rutas de negocio se prueban a través del API Gateway. Estos enlaces
quedan activos al terminar el release:

| Servicio | Documentación |
|---|---|
| API Gateway | https://sportsleague-jd-gateway.onrender.com/docs |
| Auth | https://sportsleague-jd-auth.onrender.com/docs |
| League | https://sportsleague-jd-league.onrender.com/docs |
| Team | https://sportsleague-jd-team.onrender.com/docs |
| Fixture | https://sportsleague-jd-fixture.onrender.com/docs |
| Referee | https://sportsleague-jd-referee.onrender.com/docs |
| Live Score | https://sportsleague-jd-live.onrender.com/docs |
| Statistics | https://sportsleague-jd-statistics.onrender.com/docs |
| Notification | https://sportsleague-jd-notification.onrender.com/docs |
| Analytics | https://sportsleague-jd-analytics.onrender.com/docs |

**Historial de commits.** Autores de los commits en `main` del repositorio principal, tal como los
registra git (`git shortlog -sn main`):

| Autor en git | Commits |
|---|---|
| Javierly Diaz | 40 |
| javierlydiaz21-bit | 24 |
| andres | 6 |
| cin16cc | 1 |

[CAPTURA 1: repositorio sportsleague-team-service en GitHub, con README.md, database/, .env.example, .gitignore y .github/workflows en la raíz]

[CAPTURA 2: carpeta database/ de sportsleague-team-service con esquema.sql, datos-ejemplo.sql y respaldo.sql]

[CAPTURA 3: historial de commits del repositorio principal con los autores]

[CAPTURA 4: /docs de un servicio en producción (Swagger UI) con un endpoint abierto y los campos de su DTO]

### A.3 Despliegue

**Qué pide la guía:** el enlace público de cada microservicio, activo; cada servicio conectado a su
base de datos con las credenciales en variables de entorno de la plataforma, y las integraciones
externas funcionando en producción.

**Plataformas (planes gratuitos):**

- **Render Free:** los 10 microservicios como servicios web, una PostgreSQL con una base por servicio
  (`DATABASE_NAME` elige la base de la misma instancia) y Redis. Cada servicio ejecuta la imagen
  `ghcr.io/javierlydiaz21-bit/sportsleague-app-<servicio>` que publica su repositorio.
- **Vercel Hobby:** la web.

| Servicio | Enlace | Estado |
|---|---|---|
| API Gateway | https://sportsleague-jd-gateway.onrender.com | https://sportsleague-jd-gateway.onrender.com/health |
| Auth | https://sportsleague-jd-auth.onrender.com | https://sportsleague-jd-auth.onrender.com/health |
| League | https://sportsleague-jd-league.onrender.com | https://sportsleague-jd-league.onrender.com/health |
| Team | https://sportsleague-jd-team.onrender.com | https://sportsleague-jd-team.onrender.com/health |
| Fixture | https://sportsleague-jd-fixture.onrender.com | https://sportsleague-jd-fixture.onrender.com/health |
| Referee | https://sportsleague-jd-referee.onrender.com | https://sportsleague-jd-referee.onrender.com/health |
| Live Score | https://sportsleague-jd-live.onrender.com | https://sportsleague-jd-live.onrender.com/health |
| Statistics | https://sportsleague-jd-statistics.onrender.com | https://sportsleague-jd-statistics.onrender.com/health |
| Notification | https://sportsleague-jd-notification.onrender.com | https://sportsleague-jd-notification.onrender.com/health |
| Analytics | https://sportsleague-jd-analytics.onrender.com | https://sportsleague-jd-analytics.onrender.com/health |

**Conexión con la base de datos.** `GET /health` responde `200` solo si el servicio llega a su base y
a Redis, y `503` si no. Las credenciales no están en el código: `DATABASE_URL` y `REDIS_URL` están en
las variables de cada servicio en Render, y `JWT_SECRET`, `INTERNAL_API_TOKEN` y `METRICS_TOKEN`, en el
grupo de variables compartido `sportsleague-free-shared`. La base gratuita de Render vence el
16/12/2026.

**Integraciones externas en producción** (variables en Render → `sportsleague-jd-notification`):

| Integración | Cómo funciona | Variables |
|---|---|---|
| Correo real | Notification envía por HTTPS a un Google Apps Script que manda el correo desde Gmail (Render Free bloquea los puertos SMTP) | `MAIL_RELAY_URL`, `MAIL_RELAY_SECRET` |
| Push en el navegador | Web Push con claves VAPID y el service worker de la web | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |

**Usuarios de prueba** (detalle en [ENLACES_Y_USUARIOS.md](../ENLACES_Y_USUARIOS.md)):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@sportsleague.com` | Se entrega por privado |
| Organizador | `organizador@demo.com` | `Demo12345` |
| Organizadora (2 ligas pendientes de aprobación) | `organizadora@demo.com` | `Demo12345` |
| Árbitro | `arbitro@demo.com` | `Demo12345` |
| Aficionado | `aficionado@demo.com` | `Demo12345` |

Los servicios gratuitos se duermen tras 15 minutos sin tráfico. Antes de una revisión,
`scripts/despertar.ps1` los despierta y espera a que los 10 y la web respondan `200` (README, sección
«Antes de una demostración»).

[CAPTURA 5: salida de scripts/despertar.ps1 con los 10 servicios y la web en 200]

[CAPTURA 6: panel de Render con los 10 servicios desplegados]

[CAPTURA 7: variables de entorno de un servicio en Render, con los valores ocultos]

[CAPTURA 8: web en producción con la Liga Amateur de Montería, pestaña Posiciones]

[CAPTURA 9: Administración → Sistema → «Envíos de notificaciones» con correos y push en estado «Enviado»]

### A.4 Pruebas

**Qué pide la guía:** por microservicio, al menos dos pruebas unitarias con mocks y una de
integración; un comando documentado; evidencia en local y en GitHub Actions; el reporte de cobertura
generado en el pipeline y guardado como artefacto, y la cobertura real.

**Evidencia:** [EVIDENCIAS_PRUEBAS.md](../EVIDENCIAS_PRUEBAS.md), con las dos pruebas unitarias y la de
integración de cada servicio, el archivo donde está cada una y lo que simula con Jest. Resultados del CI
del 18/11/2026 sobre `develop` (commit `99243a2`):

| Microservicio | Pruebas | Cobertura con chassis | Cobertura sin chassis | Ejecución en GitHub Actions |
|---|---|---|---|---|
| api-gateway | 54 | 57,46 % | 88,63 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095894) |
| auth-service | 34 | 64,39 % | 84,10 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095725) |
| league-service | 27 | 59,22 % | 69,46 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095362) |
| team-service | 28 | 68,14 % | 70,59 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095467) |
| fixture-service | 46 | 72,07 % | 84,42 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095406) |
| referee-service | 27 | 60,04 % | 68,86 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095370) |
| live-score-service | 29 | 74,43 % | 93,84 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095906) |
| statistics-service | 28 | 74,64 % | 93,42 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095586) |
| notification-service | 38 (1 opcional se omite) | 70,43 % | 85,53 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095592) |
| analytics-service | 32 | 60,32 % | 91,26 % | [run](https://github.com/javierlydiaz21-bit/sportsleague/actions/runs/44358095365) |
| **Total** | **343 (342 pasan y 1 se omite)** | | | |

- **Unitarias:** `src/**/*.spec.ts`, con dobles de Jest (`jest.fn()`, `jest.mock()`).
- **Integración:** `test/integration/*.integration.spec.ts`, contra PostgreSQL real (el api-gateway no
  tiene base). Simulan con servidores HTTP locales los microservicios de los que depende cada uno, así
  que las llamadas pasan por el cliente HTTP real.
- **Cobertura real:** las dos columnas son de líneas. *Con chassis* mide todo `src/` salvo `main.ts`,
  incluido el código común que se copia en los 10 servicios; *sin chassis* mide solo el código propio
  del servicio.
- **Umbral:** el `package.json` de cada servicio exige 50 % de líneas (`coverageThreshold`). Si la
  cobertura baja de ahí, Jest termina con error y el CI falla.
- **Artefacto:** cada ejecución del CI guarda el informe de cobertura como `coverage-<servicio>`.

Comandos, desde `services/<servicio>` (documentados en el README de cada servicio):

```bash
npm ci
npx prisma generate        # todos menos api-gateway, que no tiene base de datos
npm run test:unit          # unitarias
npm run test:integration   # integración (PostgreSQL de Docker Compose: docker compose up -d postgres)
npm run test:cov           # todas, con el informe de cobertura y el umbral del 50 %
```

[CAPTURA 10: pruebas de un servicio en local (npm run test:cov) con el resumen de Jest y la tabla de cobertura]

[CAPTURA 11: ejecución del CI en GitHub Actions en verde, con el artefacto coverage-team-service]

[CAPTURA 12: informe de cobertura HTML del artefacto, abierto en el navegador]

### A.5 CI/CD

**Qué pide la guía:** un CI que corra en cada push y Pull Request, instale dependencias, ejecute las
pruebas y genere la cobertura; si algo falla, no se despliega; el despliegue depende de las pruebas; los
secretos van en GitHub Secrets. Además, la estrategia de ramas y la evidencia de una prueba fallida.

**Workflows:**

| Workflow | Dónde | Cuándo | Qué hace |
|---|---|---|---|
| `ci-servicio.yml` (etiqueta `@v1`) | Repositorio principal, reutilizable | Lo llaman los demás | Tres jobs: *Lint, pruebas y build* (npm ci → Prisma → ESLint → Jest con PostgreSQL y cobertura → build), *Escaneo de secretos* (gitleaks sobre todo el historial) e *Imagen Docker* (construye sin publicar) |
| `ci.yml` | Cada repositorio de servicio | Pull Requests y push a `develop` | `ci-servicio.yml@v1` |
| `deploy.yml` («Despliegue continuo») | Cada repositorio de servicio | Push a `main`, es decir, al fusionar un Pull Request | 1) Corre el CI. 2) Solo si pasa, publica la imagen `:<sha>` y `:latest` en GHCR. 3) Llama al *deploy hook* de Render con la imagen de ese commit. Si falta el secreto del hook, el despliegue falla |
| `<servicio>.yml` → `service-pipeline.yml` | Repositorio principal | Cambios en ese servicio o en el CI compartido | CI completo y, en Live Score, pruebas de carga con k6. No publica imágenes ni despliega |
| `frontend.yml` | Repositorio principal | Cambios en la web | Lint, chequeo de tipos y build. Vercel despliega producción desde `main` |

**Una prueba fallida no llega a producción.** En `main` de cada repositorio de servicio, GitHub exige
Pull Request y los checks *ci / Lint, pruebas y build*, *ci / Escaneo de secretos* y *ci / Imagen
Docker* en verde, también para los administradores, y no permite *force push*. Evidencia: el Pull
Request [«DEMO: prueba fallida — no fusionar»](https://github.com/javierlydiaz21-bit/sportsleague-team-service/pull/5)
(rama `demo/falla-prueba`) en `sportsleague-team-service`:

- La prueba «elegibilidad de jugadores › calcula la edad cumplida considerando el día del cumpleaños»
  falla (esperado 19, recibido 18), así que *ci / Lint, pruebas y build* falla y *ci / Imagen Docker*
  se omite ([ejecución](https://github.com/javierlydiaz21-bit/sportsleague-team-service/actions/runs/44354414262)).
- GitHub bloquea el merge. Sin merge a `main`, `deploy.yml` no corre: no se publica imagen ni se
  despliega.

**Despliegue automatizado.** Prueba piloto en `sportsleague-team-service`: el
[run de «Despliegue continuo»](https://github.com/javierlydiaz21-bit/sportsleague-team-service/actions/runs/44313143371)
del commit `f3d9b76` pasó el CI, publicó la imagen y Render desplegó
`sportsleague-app-team-service:f3d9b764d7c89012205a332e196ce06c85cdb8cb`.

**Secretos:**

- Cada repositorio de servicio tiene un solo secreto en GitHub Secrets, `RENDER_DEPLOY_HOOK`, que solo
  lee el job de despliegue.
- El `GITHUB_TOKEN` solo tiene permiso para publicar paquetes en ese job.
- El repositorio principal no tiene secretos.
- Las acciones están fijadas por SHA, los checkout no guardan la credencial y gitleaks se verifica con
  su SHA-256 antes de ejecutarse.

**Estrategia de ramas** (README, «Estrategia de ramas y control de versiones»):

| Rama | Para qué | Cómo cambia |
|---|---|---|
| `main` | Lo que está en producción | Solo por Pull Request, también para los administradores, y sin *force push*. En los repositorios de servicio exige además los checks del CI en verde, y cada merge despliega ese servicio |
| `develop` | Integración de lo terminado | Pull Requests desde `feature/*` con el CI en verde |
| `feature/*` | Un cambio cada una (p. ej. `feature/openapi`, `feature/metrics-token`) | Se crean desde `develop` y vuelven a `develop` por Pull Request |
| `hotfix/*` | Urgencias de producción | Se crean desde `main` y se fusionan en `main` y en `develop` |
| `demo/*` | Demostraciones que nunca se fusionan (p. ej. `demo/falla-prueba`) | — |

**Versionado y vuelta atrás:** el CI compartido usa las etiquetas `v1.0.0`, `v1.1.0` y `v1`; las
imágenes llevan el `sha` del commit, y la API, el prefijo `/api/v1`. Para volver atrás se despliega en
Render la imagen de un `sha` anterior: todas quedan en GHCR.

[CAPTURA 13: run «Despliegue continuo» en verde en sportsleague-team-service, con los jobs ci y deploy]

[CAPTURA 14: Render → sportsleague-jd-team → Events, con el despliegue de la imagen del commit en estado live]

[CAPTURA 15: Pull Request #5 de sportsleague-team-service bloqueado: «ci / Lint, pruebas y build» en rojo e «ci / Imagen Docker» omitido]

[CAPTURA 16: detalle del job fallido con la prueba que falla (esperado 19, recibido 18)]

[CAPTURA 17: Settings → Secrets and variables → Actions de sportsleague-team-service, con RENDER_DEPLOY_HOOK]

[CAPTURA 18: regla de protección de main en sportsleague-team-service, con los tres checks obligatorios]

### A.6 Monitoreo

**Qué pide la guía:** `/metrics` en cada servicio, un `prometheus.yml` versionado con todos los
targets y un dashboard de Grafana conectado a Prometheus con disponibilidad, número de peticiones,
tiempos de respuesta y tasa de errores. La evidencia son capturas con datos reales y con los targets en
estado UP.

- **`/metrics`:** los 10 servicios exponen métricas HTTP y del dominio, por ejemplo
  `match_events_registered_total`, `live_score_update_latency_seconds`, `live_viewers_total`,
  `standings_recalculations_total`, `referee_assignments_total`, `circuit_breaker_state` y
  `gateway_rate_limit_rejections_total`. En producción `/metrics` exige
  `Authorization: Bearer <METRICS_TOKEN>` y responde `401` sin él.
- **Prometheus:** [`infra/prometheus/prometheus.yml`](../infra/prometheus/prometheus.yml) recoge los 10
  servicios cada 15 s. Las reglas de alerta están en
  [`infra/prometheus/alerts.yml`](../infra/prometheus/alerts.yml): servicio caído, tasa de errores,
  latencia del gateway, latencia del marcador en vivo, CPU alta en Live Score y circuito abierto.
- **Grafana:** dashboard «SportsLeague — Jornada en vivo»
  ([`infra/grafana/dashboards/sportsleague.json`](../infra/grafana/dashboards/sportsleague.json)), con
  filtros por liga, temporada y categoría. Por microservicio muestra disponibilidad (ARRIBA/CAÍDO),
  peticiones por segundo, tiempo de respuesta p95 y tasa de errores 5xx en %.
- **En local:** Prometheus en http://localhost:9090 y Grafana en http://localhost:3100, con Docker
  Compose.
- **En producción:** Grafana Cloud lee el `/metrics` de cada servicio de Render con un trabajo de
  recolección por servicio (`sportsleague-<servicio>`), autenticado con `METRICS_TOKEN`. El mismo
  dashboard está importado en Grafana Cloud ([`infra/grafana-cloud/`](../infra/grafana-cloud/)) y se
  publica con un
  [enlace público](https://jademantel3442.grafana.net/public-dashboards/104a3d4644dd4bfaac49d671212d5e66).
  Cada lectura despierta al servicio y Render Free da 750 horas al mes para todo el espacio de trabajo,
  así que la recolección se enciende solo para las capturas y la sustentación.
- **En la web:** *Administración → Sistema* muestra el estado de los 10 servicios y enlaza el
  dashboard de Grafana Cloud.

[CAPTURA 19: Prometheus local → Status → Targets, con los 10 servicios en UP]

[CAPTURA 20: Grafana local, dashboard «SportsLeague — Jornada en vivo» con datos en todos los paneles]

[CAPTURA 21: /metrics de un servicio en producción sin token, respondiendo 401]

[CAPTURA 22: dashboard público de Grafana Cloud con los 10 servicios ARRIBA y datos de producción]

[CAPTURA 23: Administración → Sistema en producción, con el enlace al dashboard de Grafana Cloud]

---

## Parte B · Sustentación

> **[PENDIENTE: los cinco momentos de la sustentación.** No están en el repositorio ni en los
> documentos de la guía que tenemos aquí. Cuando estén, este apartado se ordena por esos momentos y el
> guion de demostración va en el que corresponda.**]**

### Preparación

1. Unos minutos antes, despertar los servicios:
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\despertar.ps1`. Debe terminar con
   «Todo despierto».
2. Si se va a mostrar el monitoreo, encender la recolección de Grafana Cloud y apagarla al terminar.
3. Abrir dos navegadores, o uno normal y otro en privado, para tener dos sesiones a la vez.

### Guion de demostración

Cada paso indica la cuenta, la pantalla, el endpoint que llama la web (a través del API Gateway), la
regla de negocio que se ve y los microservicios que intervienen. Todos los datos son los de la liga de
demostración «Liga Amateur de Montería», ya cargada en producción.

#### 1. Crear: una liga nueva

- **Cuenta:** `organizadora@demo.com` (Sofía Martínez).
- **Pantalla:** *Mis ligas* → *Nueva liga* (`/panel/ligas/nueva`): nombre de la liga, deporte, ciudad
  y descripción → *Crear liga*.
- **Endpoint:** `POST /api/v1/leagues` (League Service).
- **Regla de negocio:** la liga queda *Pendiente de aprobación*. Mientras tanto se puede configurar,
  pero para generar y publicar el calendario debe aprobarla un administrador.
- **Comunicación:** League publica `league.created` y Notification avisa a los administradores.

#### 2. Consultar: la tabla y el calendario de una liga

- **Cuenta:** `aficionado@demo.com` (Camilo Ruiz), que sigue la liga.
- **Pantalla:** *Ligas* → «Liga Amateur de Montería» (`/ligas/[id]`), pestañas *Posiciones*,
  *Calendario*, *Goleadores* y *Disciplina*. Desde el calendario, el partido en vivo de la jornada 7
  (`/partidos/[id]`).
- **Endpoints:** `GET /api/v1/standings/:seasonId`, `GET /api/v1/top-scorers/:seasonId` y
  `GET /api/v1/disciplinary/:seasonId` (Statistics); `GET /api/v1/fixtures/:id` (Fixture).
- **Regla de negocio:** la tabla aplica el reglamento de la categoría «Libre»: 3 puntos por victoria,
  1 por empate y desempate por diferencia de gol, goles a favor y enfrentamiento directo.

#### 3. Actualizar: reprogramar un partido

- **Cuenta:** `organizador@demo.com` (Laura Gómez).
- **Pantalla:** *Mis ligas* → «Liga Amateur de Montería» → *Calendario* → un partido programado de la
  jornada 8 → *Reprogramar*: fecha, hora o cancha → *Guardar*.
- **Endpoint:** `PUT /api/v1/matches/:id/venue` (Fixture Service).
- **Reglas de negocio:** solo el organizador de la liga o el administrador; solo partidos que no han
  comenzado (`409` si no); la cancha debe ser de la liga (`400` si no).
- **Comunicación:** Fixture consulta por REST la estructura de la temporada a League y los equipos a
  Team, y publica `match.rescheduled`. Referee y Notification lo consumen: el aficionado ve el aviso en
  *Notificaciones*.

#### 4. Eliminar o cancelar: eliminar la liga del paso 1

- **Cuenta:** `organizadora@demo.com`.
- **Pantalla:** *Mis ligas* → la liga creada en el paso 1 → *Resumen* → *Eliminar liga* → confirmar.
- **Endpoint:** `DELETE /api/v1/leagues/:id` (League Service).
- **Regla de negocio:** el organizador solo puede eliminar su liga mientras no esté aprobada. Con una
  liga aprobada, el servicio responde `409`: «Una liga aprobada no se puede eliminar; solicita al
  administrador que la suspenda».
- **Para mostrar una cancelación:** *Calendario* → *Suspender* un partido programado, con su motivo
  (`PATCH /api/v1/matches/:id/status`). Fixture publica `match.suspended`, que consumen Live Score,
  Referee y Notification.

#### 5. Comunicación entre microservicios: un partido en vivo de principio a fin

- **Cuentas:** `arbitro@demo.com` (Mario Arroyo) en una ventana y `aficionado@demo.com` en la otra.
- **Pasos:**
  1. Árbitro → *Mis partidos* → su partido programado de la jornada 10 → *Confirmar*
     (`PUT /api/v1/assignments/:id/confirm`, Referee) → *Control en vivo*.
  2. Aficionado → abre ese partido (`/partidos/[id]`).
  3. Árbitro → *Iniciar partido* (`POST /api/v1/matches/:id/start`). Live Score pide el partido a
     Fixture y comprueba con Referee que Mario es el árbitro asignado, por REST. Publica
     `match.started` y Fixture pasa el partido a «en curso».
  4. Árbitro → *+ Gol* de un equipo → jugador → *Registrar* (`POST /api/v1/matches/:id/events`). Live
     Score publica `match.event` y lo difunde por WebSocket: el marcador cambia en la ventana del
     aficionado sin recargar.
  5. Árbitro → *Finalizar partido* (`POST /api/v1/matches/:id/complete`). Live Score guarda el acta y
     publica `match.completed`: Fixture marca el partido como finalizado, Statistics recalcula la tabla
     con el reglamento que consulta a League y publica `standings.updated`, Notification avisa al
     organizador y a los aficionados, y Referee también lo consume.
  6. Administrador → *Administración* → *Trazabilidad* → ese partido: su recorrido por los
     microservicios, de la publicación del calendario a las notificaciones.
- **Reglas de negocio:** solo el árbitro asignado o el organizador registran eventos (`403` para otro
  árbitro); no se inicia un partido suspendido o finalizado (`409`); después del cierre, solo el
  organizador corrige el acta, que se republica con una versión nueva.
- **Ojo:** este paso usa el único partido programado de `arbitro@demo.com`. Para ensayar antes, usa
  `organizador@demo.com` con otro partido programado: el organizador también puede operar los partidos
  de su liga.
