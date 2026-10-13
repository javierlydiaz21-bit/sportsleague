'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/format';
import type { League, Sport } from '@/lib/types';
import { useToast } from '../overlay';
import { RequireAuth } from '../require-auth';
import { Button, ButtonLink, Field, Input, PageHeader, Pills, Textarea } from '../ui';

const SPORTS: { value: Sport; label: string }[] = [
  { value: 'FOOTBALL', label: 'Fútbol' },
  { value: 'BASKETBALL', label: 'Básquet' },
  { value: 'VOLLEYBALL', label: 'Vóley' },
];

function NewLeagueForm() {
  const { api } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', sport: 'FOOTBALL' as Sport, city: '', description: '' });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const league = await api.post<League>('/leagues', {
        name: form.name,
        sport: form.sport,
        ...(form.city ? { city: form.city } : {}),
        ...(form.description ? { description: form.description } : {}),
      });
      toast.success('Liga creada. Un administrador la revisará para autorizarla.');
      router.push(`/panel/ligas/${league.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Mis ligas" title="Nueva liga" description="La liga queda pendiente hasta que un administrador la apruebe; mientras tanto puedes configurarla." />
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Nombre de la liga">
          <Input required minLength={3} maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Liga Amateur de Montería" />
        </Field>
        <div className="space-y-1.5">
          <span className="text-[13px] font-medium">Deporte</span>
          <Pills options={SPORTS} value={form.sport} onChange={(sport) => setForm((f) => ({ ...f, sport }))} />
        </div>
        <Field label="Ciudad">
          <Input maxLength={80} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Montería" />
        </Field>
        <Field label="Descripción" hint="Opcional. Se muestra en la página pública de la liga.">
          <Textarea maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={busy}>
            Crear liga
          </Button>
          <ButtonLink href="/panel" variant="ghost">
            Cancelar
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

export function NewLeague() {
  return <RequireAuth roles={['ORGANIZER', 'ADMIN']}>{() => <NewLeagueForm />}</RequireAuth>;
}
