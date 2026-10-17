/**
 * SportsLeague: envío de correos con tu cuenta de Gmail.
 *
 * Render Free bloquea los puertos SMTP, así que el Notification Service envía el correo por HTTPS a
 * este script, y el script lo manda desde tu Gmail (unos 100 correos al día en cuentas gratuitas).
 *
 * 1. https://script.google.com → «Nuevo proyecto» → pega este archivo entero.
 * 2. Cambia SECRETO por una clave larga y guárdala: es MAIL_RELAY_SECRET.
 * 3. «Implementar» → «Nueva implementación» → tipo «Aplicación web».
 *    Ejecutar como: «Yo». Quién tiene acceso: «Cualquier usuario». Autoriza el acceso a Gmail.
 * 4. La «URL de la aplicación web» (termina en /exec) es MAIL_RELAY_URL.
 */
const SECRETO = 'cambia-esto-por-una-clave-larga';

function doPost(e) {
  const datos = JSON.parse(e.postData.contents);
  if (datos.secret !== SECRETO) return responder({ ok: false, error: 'no autorizado' });
  MailApp.sendEmail({ to: datos.to, subject: datos.subject, body: datos.body, name: 'SportsLeague' });
  return responder({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
}

function responder(resultado) {
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}
