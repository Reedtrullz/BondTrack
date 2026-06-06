import useSWR from 'swr';
import { useMemo } from 'react';
import { ChangelogItem, ChangelogEntry, CHANGELOG_DATA } from '@/data/changelogs';

export type { ChangelogItem, ChangelogEntry };

async function fetcher() {
  // In a real implementation, this could fetch from an API or RSS feed
  // For now, we return the static data
  return CHANGELOG_DATA;
}

export function useChangelogs() {
  const { data, error, isLoading, mutate } = useSWR<ChangelogItem[]>(
    'changelogs',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const sortedChangelogs = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const dateA = a.sortDate || a.date;
      const dateB = b.sortDate || b.date;
      return dateB.localeCompare(dateA);
    });
  }, [data]);

  return {
    changelogs: sortedChangelogs,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

// THORChain brand colors
export const THORCHAIN_COLORS = {
  bifrostBlue: '#00CCFF',
  flashOrange: '#F3BA2F',
  yggdrasilGreen: '#33FF99',
  surtrRed: '#FF4954',
  midgardTurquoise: '#23DDC8',
  nightBlack: '#282c34',
  offWhite: '#F3F4F4',
} as const;

export function getTypeColor(type: ChangelogEntry['type']) {
  switch (type) {
    case 'update':
      // Protocol Update - Bifrost Blue (primary accent)
      return 'bg-[#00CCFF]/10 text-[#00CCFF] border-[#00CCFF]/30';
    case 'adr':
      // ADR - Flash Orange (RUNE color)
      return 'bg-[#F3BA2F]/10 text-[#F3BA2F] border-[#F3BA2F]/30';
    case 'chain':
      // Chain Status - Midgard Turquoise
      return 'bg-[#23DDC8]/10 text-[#23DDC8] border-[#23DDC8]/30';
    case 'feature':
      // New Feature - Yggdrasil Green
      return 'bg-[#33FF99]/10 text-[#33FF99] border-[#33FF99]/30';
    case 'bug':
      // Bug Fix - Surtr Red
      return 'bg-[#FF4954]/10 text-[#FF4954] border-[#FF4954]/30';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
}

export function getTypeLabel(type: ChangelogEntry['type']) {
  switch (type) {
    case 'update':
      return 'Protocol Update';
    case 'adr':
      return 'ADR';
    case 'chain':
      return 'Chain Status';
    case 'feature':
      return 'New Feature';
    case 'bug':
      return 'Bug Fix';
    default:
      return 'Update';
  }
}

export function getTypeIcon(type: ChangelogEntry['type']) {
  switch (type) {
    case 'update':
      return '⚡';
    case 'adr':
      return '📋';
    case 'chain':
      return '⛓️';
    case 'feature':
      return '🚀';
    case 'bug':
      return '🔧';
    default:
      return '📝';
  }
}

export function getTypeBadgeStyle(type: ChangelogEntry['type']): { bg: string; border: string; text: string } {
  switch (type) {
    case 'update':
      return { bg: 'rgba(0, 204, 255, 0.15)', border: 'rgba(0, 204, 255, 0.3)', text: '#00CCFF' };
    case 'adr':
      return { bg: 'rgba(243, 186, 47, 0.15)', border: 'rgba(243, 186, 47, 0.3)', text: '#F3BA2F' };
    case 'chain':
      return { bg: 'rgba(35, 220, 200, 0.15)', border: 'rgba(35, 220, 200, 0.3)', text: '#23DDC8' };
    case 'feature':
      return { bg: 'rgba(51, 255, 153, 0.15)', border: 'rgba(51, 255, 153, 0.3)', text: '#33FF99' };
    case 'bug':
      return { bg: 'rgba(255, 73, 84, 0.15)', border: 'rgba(255, 73, 84, 0.3)', text: '#FF4954' };
    default:
      return { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.3)', text: '#9ca3af' };
  }
}
