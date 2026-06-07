'use client';

import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/lib/hooks/use-watchlist';
import { Clock, Trash2, X } from 'lucide-react';

const MAX_RECENT = 5;

function truncateAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

export function RecentAddresses() {
  const router = useRouter();
  const { addresses, removeAddress, clearAddresses } = useWatchlist();
  const recent = addresses.slice(-MAX_RECENT).reverse();

  if (recent.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
        <Clock className="w-4 h-4" aria-hidden="true" />
        <span>No recent addresses saved in this browser.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        Recent Addresses
      </span>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Stored locally in this browser only. Clear them any time.
      </p>
      <div className="flex flex-wrap gap-2">
        {recent.map((address) => (
          <span key={address} className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => router.push(`/dashboard?address=${encodeURIComponent(address)}`)}
              className="px-3 py-1.5 font-mono text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {truncateAddress(address)}
            </button>
            <button
              type="button"
              onClick={() => removeAddress(address)}
              className="border-l border-zinc-200 px-2 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-red-600 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-red-400"
              aria-label={`Remove recent address ${truncateAddress(address)}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={clearAddresses}
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-zinc-500 underline-offset-4 hover:text-red-600 hover:underline dark:text-zinc-400 dark:hover:text-red-400"
      >
        <Trash2 className="h-3 w-3" aria-hidden="true" />
        Clear recent addresses
      </button>
    </div>
  );
}
