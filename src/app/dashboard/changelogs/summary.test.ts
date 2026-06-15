import { describe, expect, it } from 'vitest';
import type { ChangelogItem } from '@/lib/hooks/use-changelogs';

import { buildChangelogOperationalSummary } from './summary';

const changelogs: ChangelogItem[] = [
  {
    id: 'mar-2026',
    title: 'March 2026 update',
    date: 'Mar 2026',
    fullDate: 'March 2026',
    sortDate: '2026-03',
    content: [
      {
        type: 'update',
        title: 'Update v3.16.2',
        description: 'thornode release required for node operators after EVM chain halt.',
      },
      {
        type: 'adr',
        title: 'ADR-24',
        description: 'Revenue directed to protocol owned liquidity for LP accounting.',
      },
    ],
  },
  {
    id: 'feb-2026',
    title: 'February 2026 update',
    date: 'Feb 2026',
    fullDate: 'February 2026',
    sortDate: '2026-02',
    content: [
      {
        type: 'bug',
        title: 'Limit swap patch',
        description: 'Limit swaps needed a version upgrade.',
      },
    ],
  },
];

describe('buildChangelogOperationalSummary', () => {
  it('derives latest update and impact counts from changelog entries', () => {
    const summary = buildChangelogOperationalSummary(changelogs);

    expect(summary.latestTitle).toBe('March 2026 update');
    expect(summary.latestDate).toBe('Mar 2026');
    expect(summary.totalEntries).toBe(3);
    expect(summary.impactCounts).toEqual({
      operatorImpact: 1,
      lpImpact: 1,
      chainHalt: 1,
      upgradeRequired: 2,
    });
  });

  it('keeps empty archive state honest', () => {
    const summary = buildChangelogOperationalSummary([]);

    expect(summary.latestTitle).toBe('No updates loaded');
    expect(summary.latestDate).toBe('No archive data');
    expect(summary.totalEntries).toBe(0);
    expect(summary.impactCounts.operatorImpact).toBe(0);
  });
});
