# SportsLeague: guía para Claude

Proyecto universitario: plataforma de ligas deportivas amateur (fútbol, básquet, vóley) con
microservicios independientes. El README.md documenta todo; aquí van solo la estructura y las reglas.

## Estructura

- `services/`: 10 microservicios NestJS 11 + Prisma 6, cada uno con Dockerfile y base PostgreSQL propia.
  - api-gateway 4000, auth 4001, league 4002, team 4003, fixture 4004, referee 4005,
    live-score 4006 (Socket.IO, namespace `/live`), statistics 4007, notification 4008, analytics 4009.
  - Al arrancar: `npx prisma migrate deploy && node dist/main.js`. Healthcheck: `GET /health`.
- `chassis/`: código común. Se COPIA a `services/*/src/chassis` con `node scripts/sync-chassis.mjs`.
  Edita siempre `chassis/` y sincroniza; nunca edites solo una copia.
- `frontend/`: Next.js 15 (output standalone) + Tailwind 4, puerto 3000. Las `NEXT_PUBLIC_*` se
  incrustan al construir la imagen; el SSR usa `API_INTERNAL_URL=http://api-gateway:4000`.
- `infra/postgres/init/01-databases.sh`: 9 bases, un usuario por servicio y `analytics_ro` (solo
  lectura). Solo corre con el volumen `pgdata` nuevo: si lo cambias, `docker compose down -v`.
- `infra/prometheus`, `infra/grafana`: observabilidad (Prometheus 9090, Grafana 3100 admin/admin).
- `scripts/seed-demo.mjs`: demo determinista e idempotente (`docker compose --profile demo run --rm seed`).
- `iniciar.ps1` / `iniciar.bat` / `detener.bat` / `iniciar.sh`: arranque en un clic.
- `.github/workflows/` + `render.yaml`: CI/CD (GHCR + Render); el frontend se despliega en Vercel.
  Repositorio: github.com/javierlydiaz21-bit/sportsleague. Imágenes:
  `ghcr.io/javierlydiaz21-bit/sportsleague-app-<servicio>`. No uses `sportsleague-<servicio>`:
  esos paquetes son del proyecto anterior (`sportsleague-ms`) y este repo no puede escribir en ellos.

## Arrancar y verificar

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\iniciar.ps1 -SinNavegador`
  (`-SinConstruir` para reutilizar imágenes, `-SinDemo` sin datos). No uses `iniciar.bat` desde un
  agente: termina con `pause`. La primera construcción tarda 10-20 min: ejecútala en segundo plano.
- Diagnóstico: `docker compose ps` y `docker compose logs <servicio>`.
- Usa `http://localhost:3000`, no `127.0.0.1` (CORS y orígenes del WebSocket).
- Cuentas: admin@sportsleague.com / Admin12345; demo: organizador@, organizadora@, arbitro@,
  aficionado@demo.com / Demo12345.

## Reglas

- Todo el texto de la interfaz y la documentación va en español.
- No uses `Get-Content`/`Set-Content` de PowerShell 5.1 para reescribir archivos: corrompen las tildes.
- Codificación y finales de línea: `iniciar.ps1` en UTF-8 con BOM y CRLF; `.bat` en CRLF y solo
  ASCII; `.sh`, `Dockerfile` y `.yml` en LF (ver `.gitattributes`).
- No instales `node_modules` dentro del proyecto; los scripts auxiliares van en una carpeta temporal.
- Correcciones con el cambio mínimo en la causa raíz; no rediseñes la arquitectura.
- No hagas commit ni push, no crees cuentas y no despliegues nada sin preguntar.
- Si cambias el arranque o aparece un problema nuevo, actualiza el README («Llevar el proyecto a
  otro equipo» y su tabla de problemas).
