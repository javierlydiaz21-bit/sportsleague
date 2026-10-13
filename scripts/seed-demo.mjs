#!/usr/bin/env node
/**
 * Carga datos de demostración a través del API Gateway, exactamente como lo
 * haría la web: organizador, liga aprobada por el admin, equipos, árbitros,
 * calendario publicado, partidos jugados, uno en vivo y ligas pendientes.
 *
 *   node scripts/seed-demo.mjs                 # contra http://localhost:4000
 *   API_URL=https://mi-gateway node scripts/seed-demo.mjs
 *
 * Requiere Node 18+ (fetch nativo). Es seguro ejecutarlo dos veces: si los datos
 * ya existen, solo muestra las credenciales.
 */

const API = process.env.API_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@sportsleague.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin12345';
const PASSWORD = 'Demo12345';
const LEAGUE_NAME = 'Liga Amateur de Montería';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const step = (text) => console.log(`\n▸ ${text}`);
const info = (text) => console.log(`  ${text}`);

// PRNG determinista para que los resultados sean reproducibles.
let seed = 2026;
function random() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const slug = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
const between = (min, max) => min + Math.floor(random() * (max - min + 1));

async function call(method, path, { token, body, allow = [] } = {}) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let res;
    try {
      res = await fetch(`${API}/api/v1${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      await sleep(2500);
      continue;
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') ?? 5);
      info(`(rate limit del gateway: esperando ${wait} s)`);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status === 502 || res.status === 503) {
      await sleep(2500);
      continue;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      if (allow.includes(res.status)) return { __status: res.status, ...data };
      throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data?.message ?? data)}`);
    }
    return data;
  }
  throw new Error(`${method} ${path}: el servicio no respondió tras varios intentos`);
}

async function session(email, password, name, role) {
  const login = await call('POST', '/auth/login', { body: { email, password, client: 'mobile' }, allow: [401] });
  if (!login.__status) return login.accessToken;
  const created = await call('POST', '/auth/register', { body: { name, email, password, role, client: 'mobile' } });
  info(`cuenta creada: ${email} (${role})`);
  return created.accessToken;
}

async function waitForPlatform() {
  step(`Esperando a que la plataforma esté lista en ${API}`);
  const deadline = Date.now() + 300_000;
  let token;
  while (Date.now() < deadline) {
    try {
      if (!token) {
        const login = await fetch(`${API}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, client: 'mobile' }),
        });
        if (login.ok) token = (await login.json()).accessToken;
      }
      if (token) {
        const health = await fetch(`${API}/api/v1/system/health`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
        const down = health.services?.filter((s) => s.status !== 'up').map((s) => s.name) ?? ['?'];
        if (down.length === 0) {
          info(`${health.summary.up}/${health.summary.total} microservicios en línea`);
          return token;
        }
        info(`esperando: ${down.join(', ')}`);
      }
    } catch {
      // todavía arrancando
    }
    await sleep(5000);
  }
  throw new Error('La plataforma no estuvo lista a tiempo. Revisa `docker compose ps`.');
}

const FIRST = ['Juan', 'Carlos', 'Andrés', 'Luis', 'Miguel', 'Jorge', 'Diego', 'Santiago', 'Sebastián', 'Camilo', 'Felipe', 'Mateo', 'Daniel', 'David', 'Julián', 'Óscar', 'Esteban', 'Nicolás', 'Alejandro', 'Javier', 'Ricardo', 'Fabián'];
const LAST = ['Pérez', 'Gómez', 'Rodríguez', 'Martínez', 'García', 'López', 'Hernández', 'Díaz', 'Torres', 'Ramírez', 'Castro', 'Vargas', 'Rojas', 'Morales', 'Ortiz', 'Suárez', 'Mejía', 'Cárdenas', 'Ríos', 'Montes', 'Arrieta', 'Petro'];
const POSITIONS = ['Arquero', 'Defensa', 'Defensa', 'Defensa', 'Defensa', 'Mediocampista', 'Mediocampista', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero'];

function roster(ineligible = false) {
  return POSITIONS.map((position, index) => ({
    firstName: pick(FIRST),
    lastName: `${pick(LAST)} ${pick(LAST)}`,
    birthDate: ineligible && index === 10 ? '2012-03-14' : `${between(1988, 2006)}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`,
    jerseyNumber: index + 1,
    position,
  }));
}

async function playMatch(match, players, token, { complete = true } = {}) {
  await call('POST', `/matches/${match.id}/start`, { token });
  // Solo juegan los jugadores habilitados por la validación de elegibilidad.
  const byTeam = (teamId) => players.filter((p) => p.teamId === teamId && p.eligibilityStatus === 'ELIGIBLE');
  const events = [];
  for (const teamId of [match.homeTeamId, match.awayTeamId]) {
    const squad = byTeam(teamId);
    const attackers = squad.filter((p) => p.position !== 'Arquero');
    const goals = pick([0, 0, 1, 1, 1, 2, 2, 3, 4]);
    for (let i = 0; i < goals; i += 1) events.push({ type: 'GOAL', teamId, playerId: pick(attackers.slice(4)).id, minute: between(3, 90) });
    for (let i = 0; i < between(0, 2); i += 1) events.push({ type: 'YELLOW_CARD', teamId, playerId: pick(squad).id, minute: between(10, 88) });
    if (random() < 0.08) events.push({ type: 'RED_CARD', teamId, playerId: pick(squad).id, minute: between(30, 89) });
    const out = pick(attackers);
    const sub = squad.find((p) => p.id !== out.id && p.position === out.position) ?? pick(squad.filter((p) => p.id !== out.id));
    events.push({ type: 'SUBSTITUTION', teamId, playerId: out.id, playerInId: sub.id, minute: between(55, 80) });
  }
  events.sort((a, b) => a.minute - b.minute);
  for (const event of complete ? events : events.slice(0, 2)) {
    await call('POST', `/matches/${match.id}/events`, { token, body: event });
  }
  if (complete) await call('POST', `/matches/${match.id}/complete`, { token, body: { attendance: between(60, 450) } });
}

async function main() {
  const admin = await waitForPlatform();

  step('Organizador de la liga');
  const org = await session('organizador@demo.com', PASSWORD, 'Laura Gómez', 'ORGANIZER');
  const mine = await call('GET', '/leagues/mine', { token: org });
  if (mine.some((l) => l.name === LEAGUE_NAME)) {
    info('Los datos de demostración ya existen.');
    return summary();
  }

  step('Liga (queda pendiente) y aprobación del administrador');
  const league = await call('POST', '/leagues', {
    token: org,
    body: {
      name: LEAGUE_NAME,
      sport: 'FOOTBALL',
      city: 'Montería',
      description: 'Torneo de fútbol aficionado del valle del Sinú. Seis equipos, ida y vuelta, partidos los domingos.',
    },
  });
  info(`liga creada en estado ${league.status}`);
  await call('PATCH', `/leagues/${league.id}/review`, { token: admin, body: { status: 'APPROVED', note: 'Documentación de la liga verificada' } });
  info('aprobada por el administrador');

  step('Temporada, categoría con reglamento y canchas');
  const season = await call('POST', `/leagues/${league.id}/seasons`, {
    token: org,
    body: { name: 'Apertura 2026', year: 2026, startDate: '2026-08-30', endDate: '2026-12-13' },
  });
  const category = await call('POST', `/leagues/${league.id}/categories`, {
    token: org,
    body: { name: 'Libre', minAge: 16, maxAge: 45, rules: { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakerCriteria: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'] } },
  });
  const venues = [];
  for (const venue of [
    { name: 'Estadio Municipal de Montería', zone: 'Centro', address: 'Cra. 6 # 30-15', availableDays: [0, 6], openTime: '08:00', closeTime: '18:00' },
    { name: 'Cancha La Ribera', zone: 'Norte', address: 'Av. Primera, Ronda del Sinú', availableDays: [6], openTime: '08:00', closeTime: '16:00' },
    { name: 'Polideportivo del Sur', zone: 'Sur', address: 'Calle 41 Sur', availableDays: [0, 3], openTime: '14:00', closeTime: '20:00' },
  ]) {
    venues.push(await call('POST', `/leagues/${league.id}/venues`, { token: org, body: venue }));
  }
  info(`${venues.length} canchas`);

  step('Equipos y plantillas (elegibilidad automática por edad)');
  const teamDefs = [
    { name: 'Tigres del Sinú', coachName: 'Hernán Arrieta', homeVenueId: venues[0].id },
    { name: 'Leones de Montería', coachName: 'Rubén Mestra' },
    { name: 'Halcones FC', coachName: 'Wilson Petro', homeVenueId: venues[2].id },
    { name: 'Deportivo La Ribera', coachName: 'Álvaro Doria', homeVenueId: venues[1].id },
    { name: 'Atlético Cereté', coachName: 'Edgar Pastrana' },
    { name: 'Real Lorica', coachName: 'Jaime Cogollo' },
  ];
  const players = [];
  for (const [index, def] of teamDefs.entries()) {
    const team = await call('POST', '/teams', {
      token: org,
      body: { categoryId: category.id, ...def, contactEmail: `${slug(def.name)}@demo.com` },
    });
    const created = await call('POST', `/teams/${team.id}/players/bulk`, { token: org, body: { players: roster(index === 2) } });
    players.push(...created);
    const ineligible = created.filter((p) => p.eligibilityStatus === 'INELIGIBLE').length;
    info(`${team.name}: ${created.length} jugadores${ineligible ? ` (${ineligible} no elegible)` : ''}`);
  }

  step('Árbitros con zona y disponibilidad');
  const sunday = [{ dayOfWeek: 0, startTime: '07:00', endTime: '20:00' }];
  for (const referee of [
    { name: 'Mario Arroyo', email: 'arbitro@demo.com', zone: 'Centro', availability: [...sunday, { dayOfWeek: 6, startTime: '07:00', endTime: '20:00' }] },
    { name: 'Pedro Lozano', email: 'pedro.lozano@demo.com', zone: 'Norte', availability: sunday },
    { name: 'Ana Beltrán', email: 'ana.beltran@demo.com', zone: 'Sur', availability: [{ dayOfWeek: 0, startTime: '12:00', endTime: '21:00' }] },
    { name: 'Rafael Pacheco', email: 'rafael.pacheco@demo.com', zone: 'Centro', availability: [{ dayOfWeek: 0, startTime: '07:00', endTime: '13:00' }] },
  ]) {
    await call('POST', '/referees', { token: org, body: { ...referee, leagueId: league.id } });
  }
  const ref = await session('arbitro@demo.com', PASSWORD, 'Mario Arroyo', 'REFEREE');
  const fan = await session('aficionado@demo.com', PASSWORD, 'Camilo Ruiz', 'SPECTATOR');
  await call('POST', '/subscriptions', { token: fan, body: { leagueId: league.id } });
  info('4 árbitros · cuentas de árbitro y aficionado · el aficionado sigue la liga');

  step('Calendario automático (ida y vuelta, domingos, descanso mínimo 3 días)');
  const fixture = await call('POST', `/seasons/${season.id}/fixtures/generate`, {
    token: org,
    body: { categoryId: category.id, startDate: '2026-08-30', matchDays: [0], slotMinutes: 120, minRestDays: 3, doubleRound: true, shuffle: false },
  });
  info(`${fixture.totalRounds} jornadas, ${fixture.matches.length} partidos`);
  await call('POST', `/fixtures/${fixture.id}/publish`, { token: org });
  info('publicado → fixture.published por jornada (árbitros y notificaciones)');
  await sleep(4000);

  step('Jornadas jugadas (eventos en vivo + acta)');
  const assigned = new Set((await call('GET', '/assignments/mine', { token: ref })).map((a) => a.matchId));
  const rounds = new Map();
  for (const match of fixture.matches) rounds.set(match.round, [...(rounds.get(match.round) ?? []), match]);
  for (let round = 1; round <= 6; round += 1) {
    for (const match of rounds.get(round) ?? []) await playMatch(match, players, assigned.has(match.id) ? ref : org);
    info(`jornada ${round} finalizada`);
  }
  const today = rounds.get(7) ?? [];
  for (const match of today.slice(0, 2)) await playMatch(match, players, assigned.has(match.id) ? ref : org);
  if (today[2]) {
    await playMatch(today[2], players, assigned.has(today[2].id) ? ref : org, { complete: false });
    info('jornada 7: dos partidos finalizados y uno EN VIVO ahora');
  }

  step('Cambios de último momento');
  const nextRound = rounds.get(8) ?? [];
  if (nextRound[0]) {
    await call('PATCH', `/matches/${nextRound[0].id}/status`, { token: org, body: { status: 'SUSPENDED', reason: 'Cancha en mantenimiento por lluvias' } });
    info('un partido de la jornada 8 suspendido');
  }
  if (nextRound[1]) {
    await call('PUT', `/matches/${nextRound[1].id}/venue`, { token: org, body: { venueId: venues[2].id } });
    info('un partido de la jornada 8 cambió de sede');
  }

  step('Ligas pendientes de autorización (para el panel de administración)');
  const org2 = await session('organizadora@demo.com', PASSWORD, 'Sofía Martínez', 'ORGANIZER');
  await call('POST', '/leagues', { token: org2, body: { name: 'Liga Femenina de Vóley Cereté', sport: 'VOLLEYBALL', city: 'Cereté', description: 'Ocho clubes de vóley femenino.' } });
  await call('POST', '/leagues', { token: org2, body: { name: 'Torneo Relámpago de Básquet Sahagún', sport: 'BASKETBALL', city: 'Sahagún' } });
  info('2 ligas esperando aprobación');

  step('Verificación del sistema');
  await sleep(3000);
  const standings = await call('GET', `/standings/${season.id}?categoryId=${category.id}`);
  const played = standings.reduce((sum, row) => sum + row.played, 0) / 2;
  info(`tabla de posiciones: ${standings.length} equipos, ${played} partidos contabilizados (líder: ${standings[0]?.points ?? 0} pts)`);
  const assignments = await call('GET', `/assignments?leagueId=${league.id}`, { token: org });
  info(`árbitros asignados automáticamente: ${assignments.filter((r) => r.assignment).length}/${assignments.length} partidos`);
  const inbox = await call('GET', '/notifications', { token: org });
  info(`notificaciones del organizador: ${inbox.items.length}`);
  const etl = await call('POST', '/analytics/etl/run', { token: admin });
  info(`ETL de analítica: ${etl.status ?? 'omitido'} (${etl.rowsProcessed ?? 0} filas)`);

  summary();
}

function summary() {
  console.log(`
────────────────────────────────────────────────────────────
  Datos de demostración listos  →  http://localhost:3000

  Administrador   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
  Organizador     organizador@demo.com / ${PASSWORD}
  Organizadora 2  organizadora@demo.com / ${PASSWORD}   (ligas pendientes)
  Árbitro         arbitro@demo.com / ${PASSWORD}
  Aficionado      aficionado@demo.com / ${PASSWORD}

  Grafana         http://localhost:3100  (admin / admin)
────────────────────────────────────────────────────────────`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});
