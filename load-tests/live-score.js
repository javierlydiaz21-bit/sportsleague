// Pruebas de carga del Live Score Service con k6.
// Simula varias jornadas jugándose al mismo tiempo: cientos de espectadores
// conectados por WebSocket a decenas de partidos, más lecturas HTTP del marcador.
//
//   k6 run load-tests/live-score.js -e LIVE_URL=http://localhost:4006 -e INTERNAL_API_TOKEN=dev-internal-token-change-me
//
// Escenario opcional de árbitros (escrituras reales a través del API Gateway):
//   -e GATEWAY_URL=http://localhost:4000 -e REFEREE_TOKEN=<jwt> -e LIVE_MATCH_IDS=<id1,id2>
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import ws from 'k6/ws';

const LIVE_URL = __ENV.LIVE_URL || 'http://localhost:4006';
const WS_URL = LIVE_URL.replace(/^http/, 'ws');
const TOKEN = __ENV.INTERNAL_API_TOKEN || 'dev-internal-token-change-me';
const ROUNDS = Number(__ENV.ROUNDS || 10);
const MATCHES_PER_ROUND = Number(__ENV.MATCHES_PER_ROUND || 4);

// Partidos sintéticos: ROUNDS jornadas × MATCHES_PER_ROUND partidos en simultáneo.
const MATCHES = Array.from({ length: ROUNDS * MATCHES_PER_ROUND }, (_, i) => {
  const hex = (i + 1).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
});

const snapshots = new Counter('live_snapshots_received');
const snapshotTime = new Trend('live_snapshot_time', true);

export const options = {
  scenarios: {
    espectadores_websocket: {
      executor: 'ramping-vus',
      exec: 'spectator',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 150 },
        { duration: '40s', target: 300 },
        { duration: '20s', target: 0 },
      ],
    },
    lectura_marcador_http: {
      executor: 'constant-arrival-rate',
      exec: 'reader',
      rate: 80,
      timeUnit: '1s',
      duration: '80s',
      preAllocatedVUs: 40,
      maxVUs: 120,
    },
    ...(__ENV.REFEREE_TOKEN && __ENV.LIVE_MATCH_IDS
      ? {
          arbitros_registrando_eventos: {
            executor: 'constant-arrival-rate',
            exec: 'referee',
            rate: 2,
            timeUnit: '1s',
            duration: '60s',
            preAllocatedVUs: 5,
          },
        }
      : {}),
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:lectura_marcador_http}': ['p(95)<300'],
    ws_connecting: ['p(95)<1000'],
    live_snapshot_time: ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
};

/** Espectador: abre el WebSocket (protocolo Socket.IO v4) y se suscribe a un partido. */
export function spectator() {
  const matchId = MATCHES[(__VU + __ITER) % MATCHES.length];
  const started = Date.now();
  const res = ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {}, (socket) => {
    socket.on('message', (message) => {
      if (message.startsWith('0')) socket.send('40/live,');
      else if (message.startsWith('40/live')) socket.send(`42/live,${JSON.stringify(['subscribe', { matchId }])}`);
      else if (message === '2') socket.send('3');
      else if (message.startsWith('42/live,')) {
        const [event] = JSON.parse(message.slice('42/live,'.length));
        if (event === 'match:snapshot') {
          snapshots.add(1);
          snapshotTime.add(Date.now() - started);
        }
      }
    });
    socket.setTimeout(() => socket.close(), 15000);
  });
  check(res, { 'websocket conectado (101)': (r) => r && r.status === 101 });
}

/** Lectura del marcador por HTTP (lo que haría la web pública sin WebSocket). */
export function reader() {
  const matchId = MATCHES[Math.floor(Math.random() * MATCHES.length)];
  const res = http.get(`${LIVE_URL}/api/v1/matches/${matchId}/live`, { headers: { 'x-internal-token': TOKEN } });
  check(res, { 'marcador 200': (r) => r.status === 200 });
}

/** Árbitros registrando eventos reales a través del API Gateway (opcional). */
export function referee() {
  const ids = __ENV.LIVE_MATCH_IDS.split(',');
  const matchId = ids[Math.floor(Math.random() * ids.length)];
  const res = http.post(
    `${__ENV.GATEWAY_URL || 'http://localhost:4000'}/api/v1/matches/${matchId}/events`,
    JSON.stringify({ type: 'YELLOW_CARD', teamId: __ENV.TEAM_ID, minute: Math.floor(Math.random() * 90) }),
    { headers: { 'content-type': 'application/json', authorization: `Bearer ${__ENV.REFEREE_TOKEN}` } },
  );
  check(res, { 'evento registrado': (r) => r.status === 201 });
  sleep(0.2);
}
