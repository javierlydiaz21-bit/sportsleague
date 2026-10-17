import { Injectable } from '@nestjs/common';
import { env, envList, log } from '../chassis';

export type MailStatus = 'SENT' | 'FAILED' | 'SIMULATED';

/**
 * Correo real a través de un Google Apps Script publicado como aplicación web (apps-script/enviar-correo.gs),
 * que lo envía desde el Gmail de quien lo publica. Va por HTTPS porque Render Free bloquea los puertos SMTP.
 * Sin MAIL_RELAY_URL, o si el destinatario es de un dominio de demostración, el envío queda simulado.
 */
@Injectable()
export class Mailer {
  private readonly url = env('MAIL_RELAY_URL', '');
  private readonly secret = env('MAIL_RELAY_SECRET', '');
  private readonly skipDomains = envList('MAIL_SKIP_DOMAINS', ['demo.com', 'example.com', 'sportsleague.com']);

  async send(to: string, subject: string, body: string): Promise<MailStatus> {
    const domain = to.split('@')[1]?.toLowerCase();
    if (!this.url || !domain || this.skipDomains.includes(domain)) return 'SIMULATED';
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: this.secret, to, subject, body }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && result.ok) return 'SENT';
      log.warn('mail_failed', { status: res.status, error: result.error ?? 'respuesta inesperada', domain });
    } catch (err) {
      log.warn('mail_failed', { error: (err as Error).message, domain });
    }
    return 'FAILED';
  }
}
