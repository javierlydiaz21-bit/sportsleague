import { Mailer } from './mailer';

process.env.LOG_LEVEL = 'error';

describe('Mailer (Gmail vía Apps Script)', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.MAIL_RELAY_URL = 'https://script.google.com/macros/s/abc/exec';
    process.env.MAIL_RELAY_SECRET = 'secreto';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.MAIL_RELAY_URL;
    delete process.env.MAIL_RELAY_SECRET;
  });

  it('envía el correo al script con la clave compartida', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(new Mailer().send('ana@gmail.com', 'Asunto', 'Texto')).resolves.toBe('SENT');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://script.google.com/macros/s/abc/exec');
    expect(JSON.parse(init.body)).toEqual({ secret: 'secreto', to: 'ana@gmail.com', subject: 'Asunto', body: 'Texto' });
  });

  it('marca FAILED si el script rechaza la clave o no responde', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'no autorizado' }), { status: 200 }));
    await expect(new Mailer().send('ana@gmail.com', 'Asunto', 'Texto')).resolves.toBe('FAILED');
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(new Mailer().send('ana@gmail.com', 'Asunto', 'Texto')).resolves.toBe('FAILED');
  });

  it('simula el envío sin MAIL_RELAY_URL o para cuentas de demostración', async () => {
    await expect(new Mailer().send('aficionado@demo.com', 'Asunto', 'Texto')).resolves.toBe('SIMULATED');
    delete process.env.MAIL_RELAY_URL;
    await expect(new Mailer().send('ana@gmail.com', 'Asunto', 'Texto')).resolves.toBe('SIMULATED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
