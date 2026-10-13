<#
  SportsLeague: arranque en un clic (Windows). Solo requiere Docker Desktop.

    iniciar.bat                        doble clic: construye, arranca, carga la demo y abre la web
    .\iniciar.ps1 -SinDemo             sin datos de demostración
    .\iniciar.ps1 -SinConstruir        reutiliza las imágenes ya construidas (arranque rápido)
    .\iniciar.ps1 -SinNavegador        no abre el navegador al terminar

  Es seguro ejecutarlo varias veces: lo ya construido queda en caché y la demo no se duplica.
#>
param(
  [switch]$SinDemo,
  [switch]$SinConstruir,
  [switch]$SinNavegador
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot

$WEB = 'http://localhost:3000'
$PORTS = @(
  @{ Port = 3000; Name = 'web' },
  @{ Port = 4000; Name = 'API Gateway' },
  @{ Port = 4006; Name = 'WebSocket en vivo' },
  @{ Port = 3100; Name = 'Grafana' },
  @{ Port = 9090; Name = 'Prometheus' },
  @{ Port = 5440; Name = 'PostgreSQL' },
  @{ Port = 6380; Name = 'Redis' }
)
# Construir pocas imágenes a la vez evita los cortes de red de npm (ETIMEDOUT) y la falta de memoria.
$BUILD_GROUPS = @(
  @('auth-service', 'league-service', 'team-service'),
  @('fixture-service', 'referee-service', 'live-score-service'),
  @('statistics-service', 'notification-service', 'analytics-service'),
  @('api-gateway'),
  @('frontend')
)

function Step([string]$text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Ok([string]$text) { Write-Host "    $text" -ForegroundColor Green }
function Warn([string]$text) { Write-Host "    $text" -ForegroundColor Yellow }
function Fail([string]$text) { Write-Host ''; Write-Host "ERROR: $text" -ForegroundColor Red; exit 1 }

function Test-Engine {
  # Con límite de tiempo: si Docker Desktop está colgado, "docker info" puede no responder nunca.
  $job = Start-Job { docker info --format '{{.ServerVersion}}' *> $null; $LASTEXITCODE }
  $finished = Wait-Job $job -Timeout 20
  $ok = $finished -and ((Receive-Job $job) -eq 0)
  Remove-Job $job -Force
  return [bool]$ok
}

function Test-Url([string]$url) {
  try { return (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5).StatusCode -eq 200 } catch { return $false }
}

Write-Host 'SportsLeague - plataforma de ligas deportivas amateur' -ForegroundColor White

# ---------------------------------------------------------------- Docker
Step 'Comprobando Docker'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail 'No se encontró Docker. Instala Docker Desktop (https://www.docker.com/products/docker-desktop/), ábrelo una vez y vuelve a ejecutar este script.'
}
if (-not (Test-Engine)) {
  # Docker Desktop se instala para todos los usuarios (Program Files) o solo para el usuario actual (AppData).
  $desktop = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe')
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($desktop) {
    Warn 'Docker Desktop no está en ejecución: iniciándolo (puede tardar 1-2 minutos)...'
    Start-Process -FilePath $desktop
  } else {
    Warn 'Abre Docker Desktop y espera a que indique "Engine running"...'
  }
  $deadline = (Get-Date).AddMinutes(4)
  while (-not (Test-Engine)) {
    if ((Get-Date) -gt $deadline) {
      Fail 'Docker no respondió en 4 minutos. Abre Docker Desktop, espera a "Engine running" (si sigue sin responder, usa "Restart" en su menú) y vuelve a intentarlo.'
    }
    Write-Host '.' -NoNewline
    Start-Sleep -Seconds 5
  }
  Write-Host ''
}
docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Tu Docker no incluye "docker compose". Actualiza Docker Desktop.' }
Ok 'Docker en ejecución'

# ---------------------------------------------------------------- Puertos
Step 'Comprobando puertos'
# Los puertos que ya publica este mismo proyecto (si estaba arrancado) no cuentan como conflicto.
$ours = @()
foreach ($line in (docker ps --filter 'label=com.docker.compose.project=sportsleague' --format '{{.Ports}}' 2>$null)) {
  foreach ($match in [regex]::Matches([string]$line, ':(\d+)->')) { $ours += [int]$match.Groups[1].Value }
}
$busy = @()
foreach ($entry in $PORTS) {
  if ($ours -contains $entry.Port) { continue }
  $conn = Get-NetTCPConnection -State Listen -LocalPort $entry.Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    $owner = (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue).ProcessName
    $busy += "    puerto $($entry.Port) ($($entry.Name)) ocupado por: $owner"
  }
}
if ($busy.Count -gt 0) {
  $busy | ForEach-Object { Write-Host $_ -ForegroundColor Red }
  Write-Host '    Si el proceso es com.docker.backend o wslrelay, es otro contenedor: velo con "docker ps" y detenlo.' -ForegroundColor Yellow
  Fail 'Libera esos puertos o cambia el puerto publicado en docker-compose.yml.'
}
Ok "Disponibles: $(($PORTS | ForEach-Object { $_.Port }) -join ', ')"

# ---------------------------------------------------------------- Imágenes
if (-not $SinConstruir) {
  Step 'Construyendo las 11 imágenes (la primera vez tarda 10-20 minutos y necesita internet)'
  $index = 0
  foreach ($group in $BUILD_GROUPS) {
    $index++
    Write-Host "    [$index/$($BUILD_GROUPS.Count)] $($group -join ', ')" -ForegroundColor White
    $built = $false
    for ($attempt = 1; $attempt -le 3 -and -not $built; $attempt++) {
      if ($attempt -gt 1) { Warn "Reintentando ($attempt/3) en 10 s..."; Start-Sleep -Seconds 10 }
      docker compose build @group
      $built = $LASTEXITCODE -eq 0
    }
    if (-not $built) {
      Fail "No se pudo construir: $($group -join ', '). Revisa la conexión a internet y que Docker Desktop tenga al menos 4 GB de memoria (Settings > Resources); luego ejecuta de nuevo este script: lo ya construido queda en caché."
    }
  }
  Ok 'Imágenes listas'
}

# ---------------------------------------------------------------- Arranque
Step 'Arrancando los contenedores'
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail 'docker compose up falló. Revisa el mensaje anterior o ejecuta: docker compose logs' }

Step 'Esperando a que la plataforma responda'
$deadline = (Get-Date).AddMinutes(5)
while (-not ((Test-Url 'http://localhost:4000/health') -and (Test-Url $WEB))) {
  if ((Get-Date) -gt $deadline) {
    Fail 'La plataforma no respondió en 5 minutos. Revisa "docker compose ps" y "docker compose logs api-gateway".'
  }
  Write-Host '.' -NoNewline
  Start-Sleep -Seconds 5
}
Write-Host ''
Ok 'API Gateway y web en línea'

# ---------------------------------------------------------------- Demo
if (-not $SinDemo) {
  Step 'Cargando los datos de demostración (1-3 minutos; si ya existen solo se verifican)'
  docker compose --profile demo run --rm seed
  if ($LASTEXITCODE -ne 0) {
    Warn 'La carga de la demo falló; la plataforma funciona igual. Reintenta con: docker compose --profile demo run --rm seed'
  }
}

# ---------------------------------------------------------------- Resumen
Step 'SportsLeague está en marcha'
Write-Host "    Web ............ $WEB"
Write-Host '    API Gateway .... http://localhost:4000'
Write-Host '    Grafana ........ http://localhost:3100  (admin / admin)'
Write-Host '    Prometheus ..... http://localhost:9090'
Write-Host ''
Write-Host '    Administrador .. admin@sportsleague.com / Admin12345'
if (-not $SinDemo) {
  Write-Host '    Organizador .... organizador@demo.com / Demo12345'
  Write-Host '    Organizadora ... organizadora@demo.com / Demo12345  (2 ligas pendientes de aprobar)'
  Write-Host '    Árbitro ........ arbitro@demo.com / Demo12345'
  Write-Host '    Aficionado ..... aficionado@demo.com / Demo12345'
}
Write-Host ''
Write-Host '    Para detener: detener.bat (los datos se conservan para la próxima vez).'
if (-not $SinNavegador) { Start-Process $WEB }
