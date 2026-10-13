'use client';

import { ExternalLink, Play } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage, formatDateTime, relativeTime, uptime } from '@/lib/format';
import { useAsync, usePolling } from '@/lib/hooks';
import type { EtlRun, SystemHealth } from '@/lib/types';
import { useToast } from '../overlay';
import { Badge, Button, Card, SectionTitle, StatusDot, Table, Td, Th, cn } from '../ui';

interface Delivery {
  id: string;
  channel: string;
  recipient: string;
  subject: string;
  status: string;
  createdAt: string;
}

const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL ?? 'http://localhost:3100';
const PROMETHEUS_URL = process.env.NEXT_PUBLIC_PROMETHEUS_URL ?? 'http://localhost:9090';

export function SystemHealthView() {
  const { api } = useAuth();
  const toast = useToast();
  const { data: health, reload } = useAsync(() => api.get<SystemHealth>('/system/health'), [api]);
  const { data: runs, reload: reloadRuns } = useAsync(() => api.get<EtlRun[]>('/analytics/etl/runs').catch(() => [] as EtlRun[]), [api]);
  const { data: deliveries } = useAsync(() => api.get<Delivery[]>('/notifications/deliveries?limit=30').catch(() => [] as Delivery[]), [api]);
  const [running, setRunning] = useState(false);
  usePolling(() => void reload(), 10_000);

  const runEtl = async () => {
    setRunning(true);
    try {
      const run = await api.post<EtlRun & { skipped?: boolean; reason?: string }>('/analytics/etl/run');
      if (run.skipped) toast.info(run.reason ?? 'ETL omitido');
      else toast.success(`ETL ${run.status === 'SUCCESS' ? 'completado' : 'fallido'}: ${run.rowsProcessed} filas en ${run.durationMs} ms`);
      await reloadRuns();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          title="Microservicios"
          description={health ? `Comprobado ${relativeTime(health.checkedAt)} · se actualiza cada 10 s` : 'Consultando…'}
          action={
            <div className="flex gap-3 text-sm">
              <a href={GRAFANA_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-fg">
                Grafana <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href={PROMETHEUS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-fg">
                Prometheus <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <StatusDot status="up" /> API Gateway
              </p>
              <span className="text-xs text-muted">v{health?.gateway.version ?? '—'}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Activo {uptime(health?.gateway.uptimeSeconds)} · {health?.gateway.memoryMb ?? '—'} MB
            </p>
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <StatusDot status={health?.redis.status ?? 'down'} /> Redis (Pub/Sub, caché, rate limiting)
            </p>
            <p className="mt-2 text-xs text-muted">{health ? `${health.redis.latencyMs} ms` : '—'}</p>
          </Card>
          {(health?.services ?? []).map((service) => {
            const open = service.circuits?.filter((c) => c.state !== 'CLOSED') ?? [];
            return (
              <Card key={service.name} className={cn('p-4', service.status === 'down' && 'border-live/40')}>
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <StatusDot status={service.status} /> {service.label}
                  </p>
                  <span className="tabular text-xs text-muted">{service.latencyMs} ms</span>
                </div>
                {service.status === 'down' ? (
                  <p className="mt-2 text-xs text-live">{service.error ?? 'No responde'}</p>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-muted">
                      Activo {uptime(service.uptimeSeconds)} · {service.memoryMb ?? '—'} MB · v{service.version ?? '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(service.checks ?? {}).map(([name, check]) => (
                        <Badge key={name} tone={check.status === 'up' ? 'green' : 'red'}>
                          {name === 'database' ? 'PostgreSQL' : name === 'redis' ? 'Redis' : name}
                        </Badge>
                      ))}
                      {open.map((circuit) => (
                        <Badge key={circuit.target} tone="amber">
                          Circuito {circuit.state === 'OPEN' ? 'abierto' : 'semiabierto'} → {circuit.target}
                        </Badge>
                      ))}
                    </div>
                    {!!service.subscriptions?.length && (
                      <p className="mt-2 truncate text-[11px] text-subtle" title={service.subscriptions.join(', ')}>
                        Escucha: {service.subscriptions.join(', ')}
                      </p>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle title="Canales de eventos" description="Suscriptores conectados a cada canal de Redis Pub/Sub." />
          <Table>
            <thead>
              <tr>
                <Th>Canal</Th>
                <Th className="text-right">Suscriptores</Th>
              </tr>
            </thead>
            <tbody>
              {(health?.eventChannels ?? []).map((channel) => (
                <tr key={channel.channel}>
                  <Td className="font-mono text-xs">{channel.channel}</Td>
                  <Td className={cn('tabular text-right', channel.subscribers === 0 && 'text-subtle')}>{channel.subscribers < 0 ? '—' : channel.subscribers}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div>
          <SectionTitle
            title="ETL de analítica"
            description="Lee réplicas de solo lectura de Fixture, Live Score y Statistics."
            action={
              <Button size="sm" variant="secondary" onClick={runEtl} loading={running}>
                <Play className="h-4 w-4" /> Ejecutar ahora
              </Button>
            }
          />
          <Card className="divide-y divide-line">
            {(runs ?? []).slice(0, 8).map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <StatusDot status={run.status === 'SUCCESS' ? 'up' : run.status === 'RUNNING' ? 'degraded' : 'down'} />
                  <span>{formatDateTime(run.startedAt)}</span>
                  <span className="text-xs text-muted">({run.trigger})</span>
                </span>
                <span className="tabular text-xs text-muted">
                  {run.rowsProcessed} filas · {run.durationMs ?? '—'} ms
                </span>
              </div>
            ))}
            {runs?.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">Aún no hay ejecuciones</p>}
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle title="Envíos de notificaciones" description="Correo y push (simulados en este entorno) registrados por el Notification Service." />
        <Table>
          <thead>
            <tr>
              <Th>Canal</Th>
              <Th>Destinatario</Th>
              <Th>Asunto</Th>
              <Th>Cuándo</Th>
            </tr>
          </thead>
          <tbody>
            {(deliveries ?? []).map((delivery) => (
              <tr key={delivery.id}>
                <Td>
                  <Badge tone={delivery.channel === 'EMAIL' ? 'blue' : 'neutral'}>{delivery.channel === 'EMAIL' ? 'Correo' : 'Push'}</Badge>
                </Td>
                <Td className="max-w-56 truncate text-xs text-muted">{delivery.recipient}</Td>
                <Td className="text-sm">{delivery.subject}</Td>
                <Td className="text-xs text-muted">{relativeTime(delivery.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
