# Grafana Cloud

`sportsleague.json` es el dashboard local (`infra/grafana/dashboards/sportsleague.json`) adaptado al
stack de Grafana Cloud. Tiene los mismos 16 paneles, con dos cambios:

- **Datasource:** `grafanacloud-prom`, el Prometheus del stack, en lugar del `prometheus` de Docker Compose.
- **Etiqueta `job`:** cada microservicio se recoge con su propio trabajo de *Metrics Endpoint*, llamado
  `sportsleague-<servicio>` (por ejemplo, `sportsleague-team-service`). Grafana Cloud pone ese nombre
  en la etiqueta `job`, así que las consultas usan `job=~"sportsleague-.+"` en lugar de
  `job="sportsleague"`. El panel de disponibilidad muestra un recuadro por `job`.

Si cambia el dashboard local, hay que regenerar este archivo con esas dos sustituciones.

Para importarlo a mano: Grafana → *Dashboards* → *New* → *Import* → subir `sportsleague.json`.
