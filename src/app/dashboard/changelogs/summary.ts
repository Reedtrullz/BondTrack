import type { ChangelogItem } from '@/lib/hooks/use-changelogs';
import { matchesFilter } from './filters';

export interface ChangelogOperationalSummary {
  latestTitle: string;
  latestDate: string;
  totalEntries: number;
  totalMonths: number;
  impactCounts: {
    operatorImpact: number;
    lpImpact: number;
    chainHalt: number;
    upgradeRequired: number;
  };
}

function countImpact(changelogs: ChangelogItem[], filter: Parameters<typeof matchesFilter>[2]): number {
  return changelogs.reduce((total, item) => (
    total + item.content.filter((entry) => matchesFilter(entry, '', filter)).length
  ), 0);
}

export function buildChangelogOperationalSummary(changelogs: ChangelogItem[]): ChangelogOperationalSummary {
  const latest = changelogs[0] ?? null;

  return {
    latestTitle: latest?.title ?? 'No updates loaded',
    latestDate: latest?.date ?? 'No archive data',
    totalEntries: changelogs.reduce((total, item) => total + item.content.length, 0),
    totalMonths: changelogs.length,
    impactCounts: {
      operatorImpact: countImpact(changelogs, 'operator-impact'),
      lpImpact: countImpact(changelogs, 'lp-impact'),
      chainHalt: countImpact(changelogs, 'chain-halt'),
      upgradeRequired: countImpact(changelogs, 'upgrade-required'),
    },
  };
}
