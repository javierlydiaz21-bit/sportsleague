#!/bin/sh
# Database per Service: una base de datos y un usuario PROPIO por microservicio.
# Ningún servicio puede conectarse a la base de datos de otro (REVOKE ... FROM PUBLIC).
# Sin "set -u": si el archivo no es ejecutable, el entrypoint de postgres lo carga con "."
# y la opción quedaría activa en su propio shell.
set -e

PASS="${SERVICES_DB_PASSWORD:-sl_dev_pass}"
RO_PASS="${ANALYTICS_RO_PASSWORD:-sl_ro_pass}"

for svc in auth league team fixture referee livescore statistics notification analytics; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
CREATE USER ${svc}_user WITH PASSWORD '${PASS}';
CREATE DATABASE ${svc}_db OWNER ${svc}_user;
REVOKE ALL ON DATABASE ${svc}_db FROM PUBLIC;
EOSQL
done

# Usuario de SOLO LECTURA para el Analytics Service. En producción apunta a
# réplicas de lectura; en local simula ese acceso con permisos SELECT.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
CREATE USER analytics_ro WITH PASSWORD '${RO_PASS}';
ALTER ROLE analytics_ro SET default_transaction_read_only = on;
EOSQL

for svc in fixture livescore statistics; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${svc}_db" <<EOSQL
GRANT CONNECT ON DATABASE ${svc}_db TO analytics_ro;
GRANT USAGE ON SCHEMA public TO analytics_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE ${svc}_user IN SCHEMA public GRANT SELECT ON TABLES TO analytics_ro;
EOSQL
done

echo "Bases de datos por servicio creadas."
