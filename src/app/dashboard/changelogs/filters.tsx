import type React from 'react';
import type { ChangelogEntry, ChangelogItem } from '@/lib/hooks/use-changelogs';
import { FileText, Link as LinkIcon, Rocket, Wrench, Zap } from 'lucide-react';

export type FilterType = 'all' | ChangelogEntry['type'];

export const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Zap className="w-3 h-3" /> },
  { value: 'update', label: 'Update', icon: <Zap className="w-3 h-3" /> },
  { value: 'adr', label: 'ADR', icon: <FileText className="w-3 h-3" /> },
  { value: 'chain', label: 'Chain', icon: <LinkIcon className="w-3 h-3" /> },
  { value: 'feature', label: 'Feature', icon: <Rocket className="w-3 h-3" /> },
  { value: 'bug', label: 'Bug', icon: <Wrench className="w-3 h-3" /> },
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

export function matchesFilter(entry: ChangelogEntry, searchQuery: string, typeFilter: FilterType): boolean {
  const matchesType = typeFilter === 'all' || entry.type === typeFilter;

  if (!searchQuery.trim()) {
    return matchesType;
  }

  const query = searchQuery.toLowerCase();
  const matchesSearch =
    entry.title.toLowerCase().includes(query) ||
    entry.description.toLowerCase().includes(query);

  return matchesType && matchesSearch;
}
