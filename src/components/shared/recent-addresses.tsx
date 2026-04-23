'use client';

import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/lib/hooks/use-watchlist';
import { Clock } from 'lucide-react';

const MAX_RECENT = 5;

function truncateAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

export function RecentAddresses() {
  const router = useRouter();
  const { addresses } = useWatchlist();
  const recent = addresses.slice(-MAX_RECENT).reverse();

  if (recent.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
        <Clock className="w-4 h-4" />
        <span>No recent addresses</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        Recent Addresses
      </span>
      <div className="flex flex-wrap gap-2">
        {recent.map((address) => (
          <button
            key={address}
            onClick={() => router.push(`/dashboard?address=${encodeURIComponent(address)}`)}
            className="px-3 py-1.5 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer font-mono"
          >
            {truncateAddress(address)}
          </button>
        ))}
      </div>
    </div>
  );
}
