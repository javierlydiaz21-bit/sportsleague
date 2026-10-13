'use client';

import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/format';
import { useToast } from '../overlay';
import { Button, ButtonLink } from '../ui';

/** "Seguir liga": los aficionados reciben avisos de horarios y resultados finales. */
export function FollowButton({ leagueId, initialFollowers }: { leagueId: string; initialFollowers: number }) {
  const { status, api } = useAuth();
  const toast = useToast();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    api
      .get<{ leagueId: string }[]>('/subscriptions')
      .then((subs) => setFollowing(subs.some((s) => s.leagueId === leagueId)))
      .catch(() => undefined);
  }, [api, leagueId, status]);

  if (status === 'anonymous') {
    return (
      <ButtonLink href={`/login?next=/ligas/${leagueId}`} variant="secondary" size="sm">
        <Bell className="h-4 w-4" /> Seguir liga
      </ButtonLink>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (following) {
        await api.del(`/subscriptions/${leagueId}`);
        setFollowers((n) => Math.max(0, n - 1));
      } else {
        await api.post('/subscriptions', { leagueId });
        setFollowers((n) => n + 1);
        toast.success('Te avisaremos de horarios y resultados de esta liga');
      }
      setFollowing(!following);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={following ? 'secondary' : 'primary'} size="sm" onClick={toggle} loading={busy} disabled={status === 'loading'}>
      {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {following ? 'Siguiendo' : 'Seguir liga'}
      <span className="text-xs opacity-60">{followers}</span>
    </Button>
  );
}
