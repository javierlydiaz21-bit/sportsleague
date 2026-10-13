## Qué cambia

<!-- Describe el cambio y el microservicio afectado. -->

## Checklist de revisión

- [ ] Rama `feature/*` hacia `develop` (o `hotfix/*` hacia `main` y `develop`)
- [ ] Lint y pruebas en verde (`npm run lint && npm test` en el servicio)
- [ ] Manejo de errores, validación de datos y permisos revisados
- [ ] Si cambia un contrato de eventos (`fixture.published`, `match.completed`, ...) se actualizaron todos los consumidores y el README
- [ ] Si cambia el esquema, se agregó la migración de Prisma correspondiente
- [ ] Si se modificó `/chassis`, se ejecutó `node scripts/sync-chassis.mjs`
