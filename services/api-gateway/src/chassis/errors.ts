import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { log } from './logger';

export interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  [key: string]: unknown;
}

const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Ya existe un registro con esos datos' },
  P2003: { status: 409, message: 'La operación viola una referencia entre registros' },
  P2025: { status: 404, message: 'El registro solicitado no existe' },
};

export function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'string') return { statusCode: status, message: response };
    return { ...(response as Record<string, unknown>), statusCode: status } as ErrorBody;
  }
  const code = (exception as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && PRISMA_ERRORS[code]) {
    const known = PRISMA_ERRORS[code];
    return { statusCode: known.status, message: known.message, error: code };
  }
  return { statusCode: 500, message: 'Error interno del servidor', error: 'Internal Server Error' };
}

/** Respuesta de error uniforme en JSON y log estructurado de los errores 5xx. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const res = host.switchToHttp().getResponse<Response>();
    const body = toErrorBody(exception);
    if (body.statusCode >= 500) {
      log.error('unhandled_exception', {
        error: (exception as Error)?.message,
        stack: (exception as Error)?.stack,
      });
    }
    if (res.headersSent) return;
    res.status(body.statusCode).json(body);
  }
}
