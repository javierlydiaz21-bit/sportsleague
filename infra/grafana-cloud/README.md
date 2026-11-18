# Grafana Cloud

`sportsleague.json` es el dashboard local (`infra/grafana/dashboards/sportsleague.json`) adaptado al
stack de Grafana Cloud. Tiene los mismos 16 paneles, con dos cambios:

- **Datasource:** `grafanacloud-prom`, el Prometheus del stack, en lugar del `prometheus` de Docker Compose.
- **Etiqueta `job`:** cada microservicio se recoge con su propio trabajo de *Metrics Endpoint*, llamado
  `sportsleague-<servicio>` (por ejemplo, `sportsleague-team-service`). Grafana Cloud pone ese nombre
  en la etiqueta `job`, así que las consultas usan `job=~"sportsleague-.+"` en lugar de
  `job="sportsleague"`. El panel de disponibilidad muestra un recuadro por `job`.

Si cambia el dashboard local, hay que regenerar este archivo con esas dos sustituciones.

`sportsleague-publico.json` es la versión para compartir con un enlace externo (uid
`sportsleague-publico`), porque Grafana no admite variables de plantilla en los dashboards públicos.
Tiene los mismos 16 paneles y no tiene variables: los paneles de eventos de partido quitan el filtro
`{league_id=~"$league", season_id=~"$season", category_id=~"$category"}` y muestran todas las ligas,
temporadas y categorías. El dashboard con filtros (`sportsleague.json`) no cambia.

Para importarlo a mano: Grafana → *Dashboards* → *New* → *Import* → subir `sportsleague.json`.
