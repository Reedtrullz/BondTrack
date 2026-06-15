import type React from 'react';
import type { ChangelogEntry, ChangelogItem } from '@/lib/hooks/use-changelogs';
import { AlertTriangle, Coins, FileText, Link as LinkIcon, PauseCircle, Rocket, ShieldAlert, Wrench, Zap } from 'lucide-react';

type ImpactFilter = 'operator-impact' | 'lp-impact' | 'chain-halt' | 'upgrade-required';

export type FilterType = 'all' | ChangelogEntry['type'] | ImpactFilter;

export const FILTER_OPTIONS: { value: FilterType; label: string; shortLabel?: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Zap className="w-3 h-3" /> },
  { value: 'update', label: 'Update', icon: <Zap className="w-3 h-3" /> },
  { value: 'adr', label: 'ADR', icon: <FileText className="w-3 h-3" /> },
  { value: 'chain', label: 'Chain', icon: <LinkIcon className="w-3 h-3" /> },
  { value: 'feature', label: 'Feature', icon: <Rocket className="w-3 h-3" /> },
  { value: 'bug', label: 'Bug', icon: <Wrench className="w-3 h-3" /> },
  { value: 'operator-impact', label: 'Operator Impact', shortLabel: 'Operator', icon: <ShieldAlert className="w-3 h-3" /> },
  { value: 'lp-impact', label: 'LP Impact', shortLabel: 'LP', icon: <Coins className="w-3 h-3" /> },
  { value: 'chain-halt', label: 'Chain Halt', shortLabel: 'Halt', icon: <PauseCircle className="w-3 h-3" /> },
  { value: 'upgrade-required', label: 'Upgrade Required', shortLabel: 'Upgrade', icon: <AlertTriangle className="w-3 h-3" /> },
];

export function buildChangelogQuery(currentParams: URLSearchParams, searchQuery: string, typeFilter: FilterType): string {
  const params = new URLSearchParams(currentParams.toString());

  if (searchQuery.trim()) {
    params.set('q', searchQuery);
  } else {
    params.delete('q');
  }

  if (typeFilter !== 'all') {
    params.set('type', typeFilter);
  } else {
    params.delete('type');
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function parseTypeFilter(value: string | null): FilterType {
  const normalizedValue = value?.toLowerCase();
  return FILTER_OPTIONS.some((option) => option.value === normalizedValue) ? (normalizedValue as FilterType) : 'all';
}

export function extractYears(changelogs: ChangelogItem[]): number[] {
  const years = new Set<number>();
  changelogs.forEach((item) => {
    if (item.sortDate) {
      const year = parseInt(item.sortDate.split('-')[0], 10);
      if (!isNaN(year)) years.add(year);
    }
  });
  return Array.from(years).sort();
}

function matchesImpactFilter(entry: ChangelogEntry, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (['update', 'adr', 'chain', 'feature', 'bug'].includes(filter)) {
    return entry.type === filter;
  }

  const text = `${entry.title} ${entry.description}`.toLowerCase();
  switch (filter) {
    case 'operator-impact':
      return /\b(node|operator|validator|bond|churn|slash|jail|yggdrasil|bifrost)\b/.test(text);
    case 'lp-impact':
      return /\b(lp|liquidity|pool|saver|synth|impermanent|luvi|withdraw|deposit)\b/.test(text);
    case 'chain-halt':
      return /\b(halt|halted|paused|solvency|insolvency|chain\s+halt|trading\s+halt)\b/.test(text);
    case 'upgrade-required':
      return /\b(upgrade|required|version|hard\s*fork|thornode|release|migration)\b/.test(text);
    default:
      return false;
  }
}

export function matchesFilter(entry: ChangelogEntry, searchQuery: string, typeFilter: FilterType): boolean {
  const matchesType = matchesImpactFilter(entry, typeFilter);

  if (!searchQuery.trim()) {
    return matchesType;
  }

  const query = searchQuery.toLowerCase();
  const matchesSearch =
    entry.title.toLowerCase().includes(query) ||
    entry.description.toLowerCase().includes(query);

  return matchesType && matchesSearch;
}
