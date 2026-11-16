/**
 * Envío de un correo REAL por Gmail a través del Google Apps Script (apps-script/enviar-correo.gs).
 *
 * Es opcional: solo corre si se definen MAIL_RELAY_URL, MAIL_RELAY_SECRET y CORREO_REAL_PARA (la
 * dirección que recibe el correo). Sin ellas se omite, como en GitHub Actions, para que el CI no
 * mande un correo en cada push ni necesite la clave del relé. Ejemplo en PowerShell:
 *
 *   $env:MAIL_RELAY_URL = 'https://script.google.com/macros/s/<id>/exec'
 *   $env:MAIL_RELAY_SECRET = '<la clave SECRETO del script>'
 *   $env:CORREO_REAL_PARA = 'tu-correo@gmail.com'
 *   npx jest real-mail
 */
import { Mailer } from '../../src/notifications/mailer';

const to = process.env.CORREO_REAL_PARA;
const configured = Boolean(process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET && to);

(configured ? describe : describe.skip)('Notification Service · correo real por Gmail (opcional)', () => {
  it('el Apps Script acepta el correo, Gmail lo envía y el resultado es SENT', async () => {
    const sentAt = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const status = await new Mailer().send(
      to as string,
      'SportsLeague: prueba automatizada de correo real',
      `Este correo lo envió la prueba de integración del Notification Service el ${sentAt}.\n\n` +
        'Si lo recibes, el canal de correo real (Apps Script + Gmail) funciona.',
    );
    expect(status).toBe('SENT');
  }, 30_000);
});
