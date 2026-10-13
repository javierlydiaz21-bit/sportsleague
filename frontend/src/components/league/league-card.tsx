import { ArrowUpRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { SPORT_LABEL } from '@/lib/format';
import type { League } from '@/lib/types';
import { Badge } from '../ui';

const SPORT_TONE = { FOOTBALL: 'green', BASKETBALL: 'amber', VOLLEYBALL: 'blue' } as const;

export function LeagueCard({ league, href }: { league: League; href?: string }) {
  return (
    <Link
      href={href ?? `/ligas/${league.id}`}
      className="group flex flex-col justify-between rounded-xl border border-line bg-elevated p-5 transition hover:border-line-strong hover:shadow-sm"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <Badge tone={SPORT_TONE[league.sport]}>{SPORT_LABEL[league.sport]}</Badge>
          <ArrowUpRight className="h-4 w-4 text-subtle transition group-hover:text-fg" />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-tight">{league.name}</h3>
        {league.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{league.description}</p>}
      </div>
      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        {league.city && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {league.city}
          </span>
        )}
        {league._count && (
          <span>
            {league._count.categories} categoría{league._count.categories === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </Link>
  );
}
