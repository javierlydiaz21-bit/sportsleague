import type { LoggerService } from '@nestjs/common';
import { serviceInfo } from './config';
import { currentContext } from './request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface LogEntry extends LogFields {
  ts: string;
  level: LogLevel;
  service: string;
  msg: string;
  matchId?: string;
}

type TraceSink = (entry: LogEntry) => void;
let traceSink: TraceSink | undefined;

/** El TraceService registra aquí un "sink" que replica en Redis los logs con match_id. */
export function setTraceSink(sink: TraceSink | undefined): void {
  traceSink = sink;
}

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  return LEVELS[configured ?? 'info'] ?? LEVELS.info;
}

function write(level: LogLevel, msg: string, fields: LogFields = {}): void {
  if (LEVELS[level] < minLevel()) return;
  const { noTrace, ...rest } = fields;
  const ctx = currentContext();
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    service: serviceInfo.name,
    msg,
    ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
    ...(ctx?.userId ? { userId: ctx.userId } : {}),
    ...(ctx?.matchId ? { matchId: ctx.matchId } : {}),
    ...rest,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);

  if (entry.matchId && !noTrace && traceSink) {
    try {
      traceSink(entry);
    } catch {
      // La trazabilidad nunca debe romper la operación principal.
    }
  }
}

/** Logger estructurado (JSON por línea). */
export const log = {
  debug: (msg: string, fields?: LogFields) => write('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => write('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => write('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => write('error', msg, fields),
};

/** Registra un hito del ciclo de vida de un partido (trazabilidad por match_id). */
export function traceMatch(matchId: string, msg: string, fields: LogFields = {}): void {
  write('info', msg, { ...fields, matchId });
}

function stringify(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message instanceof Error) return message.message;
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function contextFields(params: unknown[]): LogFields {
  const fields: LogFields = {};
  for (const param of params) {
    if (typeof param === 'string') {
      if (param.includes('\n') && param.includes(' at ')) fields.stack = param;
      else fields.context = param;
    } else if (param && typeof param === 'object') {
      Object.assign(fields, param);
    }
  }
  return fields;
}

/** Adaptador para que los logs internos de NestJS también salgan en JSON. */
export class JsonLogger implements LoggerService {
  log(message: unknown, ...params: unknown[]): void {
    write('info', stringify(message), contextFields(params));
  }

  error(message: unknown, ...params: unknown[]): void {
    const fields = contextFields(params);
    if (message instanceof Error && !fields.stack) fields.stack = message.stack;
    write('error', stringify(message), fields);
  }

  warn(message: unknown, ...params: unknown[]): void {
    write('warn', stringify(message), contextFields(params));
  }

  debug(message: unknown, ...params: unknown[]): void {
    write('debug', stringify(message), contextFields(params));
  }

  verbose(message: unknown, ...params: unknown[]): void {
    write('debug', stringify(message), contextFields(params));
  }

  fatal(message: unknown, ...params: unknown[]): void {
    write('error', stringify(message), { ...contextFields(params), fatal: true });
  }
}
