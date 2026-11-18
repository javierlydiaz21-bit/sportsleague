<#
.SYNOPSIS
  Despierta los 10 microservicios de producción (Render Free) y la web antes de una demostración.

.DESCRIPTION
  Llama a la vez al /health de los 10 servicios (comprueba su base de datos y Redis) y a la
  página principal de la web (la web no tiene /health). Repite cada 5 s hasta que todos
  respondan 200 y muestra cuánto tardó cada uno desde el inicio.

  Uso, desde la carpeta del proyecto:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\despertar.ps1

.PARAMETER MaxMinutos
  Tiempo máximo de espera (5 por defecto). Si alguno no responde 200, termina con código 1.
#>
param(
  [int]$MaxMinutos = 5
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

$destinos = @(
  @{ Nombre = 'api-gateway';          Url = 'https://sportsleague-jd-gateway.onrender.com/health' },
  @{ Nombre = 'auth-service';         Url = 'https://sportsleague-jd-auth.onrender.com/health' },
  @{ Nombre = 'league-service';       Url = 'https://sportsleague-jd-league.onrender.com/health' },
  @{ Nombre = 'team-service';         Url = 'https://sportsleague-jd-team.onrender.com/health' },
  @{ Nombre = 'fixture-service';      Url = 'https://sportsleague-jd-fixture.onrender.com/health' },
  @{ Nombre = 'referee-service';      Url = 'https://sportsleague-jd-referee.onrender.com/health' },
  @{ Nombre = 'live-score-service';   Url = 'https://sportsleague-jd-live.onrender.com/health' },
  @{ Nombre = 'statistics-service';   Url = 'https://sportsleague-jd-statistics.onrender.com/health' },
  @{ Nombre = 'notification-service'; Url = 'https://sportsleague-jd-notification.onrender.com/health' },
  @{ Nombre = 'analytics-service';    Url = 'https://sportsleague-jd-analytics.onrender.com/health' },
  @{ Nombre = 'web (Vercel)';         Url = 'https://sportsleague-cyan.vercel.app/' }
) | ForEach-Object {
  [pscustomobject]@{
    Nombre   = $_.Nombre
    Url      = $_.Url
    Intentos = 0
    Tarea    = $null
    Listo    = $false
    Segundos = $null
    Ultimo   = 'sin respuesta'
    Proximo  = [TimeSpan]::Zero
  }
}

$cliente = New-Object System.Net.Http.HttpClient
$cliente.Timeout = [TimeSpan]::FromSeconds(70)
$reloj = [Diagnostics.Stopwatch]::StartNew()
$limite = [TimeSpan]::FromMinutes($MaxMinutos)
$siguienteAviso = [TimeSpan]::FromSeconds(15)

Write-Host "Despertando $($destinos.Count) destinos (máximo $MaxMinutos min)..."

while ($true) {
  $pendientes = @($destinos | Where-Object { -not $_.Listo })
  $enCurso = @($pendientes | Where-Object { $null -ne $_.Tarea })
  if ($pendientes.Count -eq 0) { break }
  if ($reloj.Elapsed -ge $limite -and $enCurso.Count -eq 0) { break }

  foreach ($d in $pendientes) {
    if ($null -eq $d.Tarea) {
      if ($reloj.Elapsed -ge $d.Proximo -and $reloj.Elapsed -lt $limite) {
        $d.Intentos++
        $d.Tarea = $cliente.GetAsync($d.Url)
      }
      continue
    }
    if (-not $d.Tarea.IsCompleted) { continue }

    $tarea = $d.Tarea
    $d.Tarea = $null
    if ($tarea.Status -eq 'RanToCompletion') {
      $codigo = [int]$tarea.Result.StatusCode
      $ruta = $null
      [void]$tarea.Result.Headers.TryGetValues('x-render-routing', [ref]$ruta)
      $tarea.Result.Dispose()
      if ($codigo -eq 200) {
        $d.Listo = $true
        $d.Segundos = [math]::Round($reloj.Elapsed.TotalSeconds)
        Write-Host ('  OK  {0,-21} 200 a los {1,3} s ({2} intento(s))' -f $d.Nombre, $d.Segundos, $d.Intentos) -ForegroundColor Green
        continue
      }
      $d.Ultimo = "HTTP $codigo"
      if ($ruta) { $d.Ultimo += " (x-render-routing: $($ruta -join ','))" }
    } elseif ($tarea.IsCanceled) {
      $d.Ultimo = 'sin respuesta en 70 s'
    } else {
      $d.Ultimo = $tarea.Exception.GetBaseException().Message
    }
    $d.Proximo = $reloj.Elapsed + [TimeSpan]::FromSeconds(5)
  }

  if ($reloj.Elapsed -ge $siguienteAviso) {
    $faltan = @($destinos | Where-Object { -not $_.Listo } | ForEach-Object { "$($_.Nombre) ($($_.Ultimo))" })
    if ($faltan.Count -gt 0) {
      Write-Host ('  ... {0,3} s, esperando: {1}' -f [math]::Round($reloj.Elapsed.TotalSeconds), ($faltan -join ', ')) -ForegroundColor DarkGray
    }
    $siguienteAviso = $reloj.Elapsed + [TimeSpan]::FromSeconds(15)
  }
  Start-Sleep -Milliseconds 500
}

$cliente.Dispose()
$total = [math]::Round($reloj.Elapsed.TotalSeconds)

Write-Host ''
Write-Host 'Tiempo hasta responder 200:'
foreach ($d in $destinos) {
  if ($d.Listo) {
    Write-Host ('  {0,-21} {1,4} s   {2} intento(s)' -f $d.Nombre, $d.Segundos, $d.Intentos)
  } else {
    Write-Host ('  {0,-21} FALTA    último resultado: {1} ({2} intento(s))' -f $d.Nombre, $d.Ultimo, $d.Intentos) -ForegroundColor Red
  }
}

$fallidos = @($destinos | Where-Object { -not $_.Listo })
Write-Host ''
if ($fallidos.Count -eq 0) {
  Write-Host "Todo despierto: los $($destinos.Count) destinos respondieron 200 en $total s." -ForegroundColor Green
  exit 0
}
Write-Host "No respondieron 200 en $MaxMinutos min: $(($fallidos | ForEach-Object { $_.Nombre }) -join ', ')." -ForegroundColor Red
Write-Host 'Mira la sección «Antes de una demostración» del README.' -ForegroundColor Red
exit 1
