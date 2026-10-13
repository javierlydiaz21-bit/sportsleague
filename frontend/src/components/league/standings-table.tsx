import Link from 'next/link';
import type { Standing, Team } from '@/lib/types';
import { Table, TeamBadge, Td, Th, cn } from '../ui';

const FORM_COLOR: Record<string, string> = { G: 'bg-brand', E: 'bg-subtle', P: 'bg-live' };

export function StandingsTable({ rows, teams, scoreLabel = 'G' }: { rows: Standing[]; teams: Map<string, Team>; scoreLabel?: string }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-10 text-center">#</Th>
          <Th>Equipo</Th>
          <Th className="text-center">PJ</Th>
          <Th className="hidden text-center sm:table-cell">G</Th>
          <Th className="hidden text-center sm:table-cell">E</Th>
          <Th className="hidden text-center sm:table-cell">P</Th>
          <Th className="hidden text-center sm:table-cell">{scoreLabel}F</Th>
          <Th className="hidden text-center sm:table-cell">{scoreLabel}C</Th>
          <Th className="text-center">Dif</Th>
          <Th className="text-center">Pts</Th>
          <Th className="hidden md:table-cell">Últimos</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const team = teams.get(row.teamId);
          return (
            <tr key={row.teamId} className="tabular">
              <Td className={cn('text-center text-muted', index === 0 && row.played > 0 && 'font-semibold text-brand')}>{index + 1}</Td>
              <Td>
                <Link href={`/equipos/${row.teamId}`} className="flex items-center gap-2.5 font-medium hover:underline">
                  <TeamBadge name={team?.name ?? '?'} color={team?.color} size="sm" />
                  {team?.name ?? 'Equipo eliminado'}
                </Link>
              </Td>
              <Td className="text-center text-muted">{row.played}</Td>
              <Td className="hidden text-center sm:table-cell">{row.wins}</Td>
              <Td className="hidden text-center sm:table-cell">{row.draws}</Td>
              <Td className="hidden text-center sm:table-cell">{row.losses}</Td>
              <Td className="hidden text-center text-muted sm:table-cell">{row.goalsFor}</Td>
              <Td className="hidden text-center text-muted sm:table-cell">{row.goalsAgainst}</Td>
              <Td className="text-center">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</Td>
              <Td className="text-center font-semibold">{row.points}</Td>
              <Td className="hidden md:table-cell">
                <div className="flex gap-1">
                  {row.form.map((result, i) => (
                    <span key={i} title={result === 'G' ? 'Ganó' : result === 'E' ? 'Empató' : 'Perdió'} className={cn('h-2 w-2 rounded-full', FORM_COLOR[result])} />
                  ))}
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
