#!/usr/bin/env sh
# SportsLeague: arranque en un comando (Linux/macOS). Solo requiere Docker con el plugin compose.
#   sh iniciar.sh                  construye, arranca y carga la demo
#   sh iniciar.sh --sin-demo       sin datos de demostración
#   sh iniciar.sh --sin-construir  reutiliza las imágenes ya construidas
set -u
cd "$(dirname "$0")" || exit 1

DEMO=1
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --sin-demo) DEMO=0 ;;
    --sin-construir) BUILD=0 ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

step 'Comprobando Docker'
command -v docker >/dev/null 2>&1 || fail 'No se encontró Docker. Instala Docker Desktop o Docker Engine con el plugin compose.'
docker info >/dev/null 2>&1 || fail 'Docker no está en ejecución. Inícialo y vuelve a intentarlo.'
docker compose version >/dev/null 2>&1 || fail 'Falta el plugin "docker compose".'

if [ "$BUILD" = 1 ]; then
  step 'Construyendo las 11 imágenes (la primera vez tarda 10-20 minutos y necesita internet)'
  # Pocas imágenes a la vez: evita los cortes de red de npm (ETIMEDOUT) y la falta de memoria.
  for group in 'auth-service league-service team-service' 'fixture-service referee-service live-score-service' \
    'statistics-service notification-service analytics-service' 'api-gateway' 'frontend'; do
    echo "    $group"
    built=0
    for attempt in 1 2 3; do
      # shellcheck disable=SC2086 # el grupo se separa en varios servicios a propósito
      if docker compose build $group; then built=1; break; fi
      [ "$attempt" -lt 3 ] && { echo "    reintentando en 10 s..."; sleep 10; }
    done
    [ "$built" = 1 ] || fail "No se pudo construir: $group. Revisa la conexión y vuelve a ejecutar (lo construido queda en caché)."
  done
fi

step 'Arrancando los contenedores'
docker compose up -d || fail 'docker compose up falló (¿puertos 3000, 3100, 4000, 4006, 5440, 6380 o 9090 ocupados?).'

step 'Esperando a que la plataforma responda'
tries=0
until curl -fsS -o /dev/null http://localhost:4000/health 2>/dev/null && curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; do
  tries=$((tries + 1))
  [ "$tries" -gt 60 ] && fail 'La plataforma no respondió en 5 minutos. Revisa: docker compose ps'
  printf '.'
  sleep 5
done
echo

if [ "$DEMO" = 1 ]; then
  step 'Cargando los datos de demostración (si ya existen solo se verifican)'
  docker compose --profile demo run --rm seed || echo '    La demo falló; reintenta con: docker compose --profile demo run --rm seed'
fi

step 'SportsLeague está en marcha: http://localhost:3000'
echo '    Administrador: admin@sportsleague.com / Admin12345'
[ "$DEMO" = 1 ] && echo '    Organizador:   organizador@demo.com / Demo12345 (más cuentas en el README)'
echo '    Para detener:  docker compose down'
