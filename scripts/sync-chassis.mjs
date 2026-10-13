#!/usr/bin/env node
/**
 * Copia la plantilla del "microservice chassis" (carpeta /chassis) dentro de
 * cada microservicio (services/<servicio>/src/chassis).
 *
 * El chassis se VENDORIZA a propósito: cada servicio es dueño de su copia y se
 * construye/despliega sin depender de una librería compartida. Ejecuta este
 * script solo cuando quieras propagar una mejora del chassis:
 *
 *   node scripts/sync-chassis.mjs            # todos los servicios
 *   node scripts/sync-chassis.mjs team-service fixture-service
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = join(root, 'chassis');
const servicesDir = join(root, 'services');
const selected = process.argv.slice(2);

const services = readdirSync(servicesDir).filter(
  (name) => statSync(join(servicesDir, name)).isDirectory() && (selected.length === 0 || selected.includes(name)),
);

for (const service of services) {
  const target = join(servicesDir, service, 'src', 'chassis');
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(template, target, {
    recursive: true,
    filter: (src) => statSync(src).isDirectory() || src.endsWith('.ts'),
  });
  console.log(`chassis sincronizado en ${service}`);
}
