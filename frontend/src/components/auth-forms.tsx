'use client';

import { Eye, ShieldCheck, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { homeFor, useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/format';
import type { Role } from '@/lib/types';
import { Button, Field, Input, Notice, cn } from './ui';

function useRedirectAfterAuth() {
  const router = useRouter();
  const params = useSearchParams();
  return (role: Role) => {
    const next = params.get('next');
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : homeFor(role));
  };
}

export function LoginForm() {
  const { login, user, status } = useAuth();
  const redirect = useRedirectAfterAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && user) redirect(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const logged = await login(email, password);
      redirect(logged.role);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-muted">Organizadores, árbitros, aficionados y administradores usan la misma entrada.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Correo">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
        </Field>
        <Field label="Contraseña">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Notice tone="red">{error}</Notice>}
        <Button type="submit" className="w-full" loading={busy}>
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="font-medium text-fg hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}

const ROLE_OPTIONS: { value: Exclude<Role, 'ADMIN'>; title: string; text: string; icon: typeof Trophy }[] = [
  { value: 'ORGANIZER', title: 'Organizador', text: 'Creo y administro ligas, equipos y calendarios.', icon: Trophy },
  { value: 'REFEREE', title: 'Árbitro', text: 'Registro eventos en vivo de mis partidos asignados.', icon: ShieldCheck },
  { value: 'SPECTATOR', title: 'Aficionado', text: 'Sigo ligas y recibo horarios y resultados.', icon: Eye },
];

export function RegisterForm() {
  const { register } = useAuth();
  const redirect = useRedirectAfterAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ORGANIZER' as Exclude<Role, 'ADMIN'> });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await register(form);
      redirect(created.role);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mt-2 text-sm text-muted">Elige cómo vas a usar SportsLeague. Las ligas nuevas quedan pendientes hasta que un administrador las autoriza.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map(({ value, title, text, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, role: value }))}
              className={cn(
                'rounded-xl border p-3 text-left transition',
                form.role === value ? 'border-fg bg-surface' : 'border-line hover:border-line-strong',
              )}
              aria-pressed={form.role === value}
            >
              <Icon className={cn('h-4 w-4', form.role === value ? 'text-brand' : 'text-subtle')} />
              <p className="mt-2 text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">{text}</p>
            </button>
          ))}
        </div>
        <Field label="Nombre completo">
          <Input required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Laura Gómez" />
        </Field>
        <Field label="Correo" hint={form.role === 'REFEREE' ? 'Usa el mismo correo con el que el organizador te registró como árbitro.' : undefined}>
          <Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres, con letras y números.">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </Field>
        {error && <Notice tone="red">{error}</Notice>}
        <Button type="submit" className="w-full" loading={busy}>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-fg hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
