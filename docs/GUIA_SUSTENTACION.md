# Guía para la sustentación · SportsLeague

**Antes de empezar:** correr `scripts/despertar.ps1` (todo en 200) · abrir dos navegadores (uno en
privado) · web https://sportsleague-cyan.vercel.app · tener a mano la contraseña del administrador.

## Los cinco momentos

1. **Contexto:** ligas amateur (fútbol, básquet, vóley) que se manejan con hojas de cálculo y grupos de
   WhatsApp. Usuarios: organizador, administrador, árbitro y aficionado. Objetivo (M1): un sistema
   centralizado que programa partidos, registra resultados en vivo y mantiene informados a equipos,
   jugadores y árbitros. Alcance: 10 microservicios, web, app móvil, despliegue, pruebas, CI/CD y monitoreo.
2. **Arquitectura:** 10 microservicios NestJS, cada uno con su base PostgreSQL. Todo entra por el API
   Gateway (JWT, rate limiting, CORS). REST con *timeout*, reintentos y *circuit breaker* solo donde hace
   falta respuesta inmediata; eventos en Redis Pub/Sub para el flujo del partido; WebSocket para el
   marcador. Coordinación por eventos, sin orquestador. Auth: bcrypt, JWT con refresh rotativo, CSRF y
   cuatro roles. Diagramas y entidad-relación en el documento (Parte B, momento 2).
3. **Stack:** TypeScript sobre Node.js 22, NestJS 11, Prisma 6, PostgreSQL 16, Redis 7, Socket.IO,
   Next.js 15, React Native (Expo), Docker, GitHub Actions y GHCR, Jest, k6, Prometheus y Grafana,
   Render y Vercel (planes gratuitos), Gmail vía Google Apps Script (Render Free bloquea SMTP).
4. **Pruebas, despliegue y monitoreo:** dos unitarias con mocks y una de integración por servicio (343
   pruebas), cobertura como artefacto `coverage-<servicio>`; `ci.yml` y `deploy.yml` (CI → imagen →
   Render); el PR #5 de team-service, bloqueado por una prueba fallida; ramas `main`, `develop` y
   `feature/*`; Prometheus con 10/10 UP y Grafana con datos.
5. **Demostración:** la tabla siguiente.

## Demostración · liga «Liga Amateur de Montería» · contraseña `Demo12345`

| # | Cuenta | Qué hacer | Qué mostrar |
|---|---|---|---|
| 1. Crear | `organizadora@demo.com` | *Mis ligas* → *Nueva liga* → *Crear liga* | Queda *Pendiente de aprobación*; el administrador recibe el aviso |
| 2. Consultar | `aficionado@demo.com` | *Ligas* → la liga → *Posiciones*, *Calendario*, *Goleadores*, *Disciplina* | Tabla con 3-1-0 y desempates por diferencia de gol, goles a favor y enfrentamiento directo |
| 3. Actualizar | `organizador@demo.com` | *Mis ligas* → la liga → *Calendario* → partido de la jornada 8 → *Reprogramar* | El aficionado ve el aviso en *Notificaciones* (`match.rescheduled`) |
| 4. Eliminar | `organizadora@demo.com` | La liga del paso 1 → *Resumen* → *Eliminar liga* | Solo se puede mientras no esté aprobada (si no, `409`) |
| 5. Comunicación | `arbitro@demo.com` y `aficionado@demo.com` | *Mis partidos* → jornada 10 → *Confirmar* → *Control en vivo* → *Iniciar partido* → *Gol* → *Registrar* → *Finalizar partido*; después, admin → *Trazabilidad* | El gol llega al aficionado sin recargar (WebSocket); la tabla se recalcula; llegan las notificaciones; la trazabilidad muestra el recorrido |

- **Caso de error:** en `/login`, una contraseña equivocada y luego un correo que no existe: los dos
  responden «Correo o contraseña incorrectos» (`401`, mismo mensaje).
- **Caso alterno:** fichar en un equipo un jugador menor de 16 años: queda *No elegible*. Luego
  eliminarlo.
- **Ojo:** el paso 5 usa el único partido programado de `arbitro@demo.com`; no ensayarlo con esa
  cuenta. En el partido en vivo de la jornada 7, escribir el minuto a mano (0 a 200) antes de registrar
  un evento; si no, responde `400`.
- **Si preguntan por `/docs`:** OpenAPI está en el código y en local (por ejemplo,
  http://localhost:4002/docs); producción tiene la versión del 16/11, con los endpoints en el README de
  cada servicio.

## Si preguntan por SAGA

- **No se implementó, por decisión de diseño** (documento de arquitectura, sección 4.3): en SportsLeague
  no hay una transacción de negocio que deba revertirse en cadena, como pago, inventario y envío en
  comercio electrónico.
- **Qué se usa en su lugar:** consistencia eventual. Los consumidores son idempotentes y no duplican
  asignaciones, avisos ni actas. Las actas tienen versión. La tabla se recalcula y, si se perdió un
  evento, *Recalcular* recupera el acta desde Live Score (conciliación).
- **Dónde se demuestra:** pruebas «procesar el mismo evento dos veces no duplica efectos» (Statistics),
  «el organizador recalcula con conciliación y recupera del Live Score Service el acta que se había
  perdido» (Statistics, integración) y «no asigna dos veces el mismo partido si el evento se repite»
  (Referee).
