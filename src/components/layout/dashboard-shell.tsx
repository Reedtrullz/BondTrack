'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { mutate } from 'swr';
import { RefreshCw, Clock, Wifi } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '@/components/layout/sidebar';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ApiHealthBanner } from '@/components/shared/api-health-banner';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';
import type { ApiHealthState } from '@/lib/hooks/use-api-health';
import { useWalletBalance } from '@/lib/hooks/use-wallet-balance';
import { useWalletContext } from '@/lib/hooks/use-wallet';
import { ChurnCountdown } from '@/components/dashboard/churn-countdown';
import { formatRuneFromNumber } from '@/lib/utils/formatters';
import { getTHORNameReverseLookupNoRetry as getTHORNameReverseLookup } from '@/lib/api/midgard';
import { getThorNameReverseLookupStorageKey } from '@/lib/storage/keys';

const SWR_KEYS = [
  'nodes',
  'earnings-history',
  'rune-price',
  'network-constants',
  'network-metrics',
  'health',
  'current-block-height',
  'churn-countdown',
];

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatSourceAge(source: 'Midgard' | 'THORNode', checkedAt: Date | null, now: number): string {
  return checkedAt ? `${source} ${formatElapsed(now - checkedAt.getTime())}` : `${source} pending`;
}

function getCompactFreshnessLabel(freshnessLabel: string): string {
  if (freshnessLabel.includes('degraded') || freshnessLabel.includes('unknown')) {
    return 'Sources degraded';
  }
  if (freshnessLabel.includes('pending')) {
    return 'Checking sources';
  }
  return 'Sources synced';
}

export function getSourceFreshnessLabel(
  lastSuccessful: ApiHealthState['lastSuccessful'],
  lastChecked: Date | null,
  now: number | null
): string {
  if (now === null) {
    return lastChecked ? 'Source health degraded or unknown' : 'Checking source health';
  }

  if (lastSuccessful.midgard || lastSuccessful.thornode) {
    return [
      formatSourceAge('Midgard', lastSuccessful.midgard, now),
      formatSourceAge('THORNode', lastSuccessful.thornode, now),
    ].join(' · ');
  }

  return lastChecked ? 'Source health degraded or unknown' : 'Checking source health';
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
}

export function DashboardShell({
  children,
  requireAddress = true,
}: {
  children: React.ReactNode;
  requireAddress?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const [thorName, setThorName] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const { midgard, thornode, lastChecked, lastSuccessful } = useApiHealthContext();
  const { address: walletAddress } = useWalletContext();
  const { balance } = useWalletBalance(walletAddress);

  const hasAddress = requireAddress ? !!address : true;

  const freshnessLabel = getSourceFreshnessLabel(lastSuccessful, lastChecked, now);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    SWR_KEYS.forEach((key) => mutate(key));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!address) {
      setThorName(null);
      return;
    }

    let cancelled = false;

    if (typeof window !== 'undefined') {
      const cachedThorName = sessionStorage.getItem(getThorNameReverseLookupStorageKey(address));

      if (cachedThorName) {
        setThorName(cachedThorName === '__none__' ? null : cachedThorName);
        return () => {
          cancelled = true;
        };
      }
    }

    getTHORNameReverseLookup(address)
      .then((data) => {
        if (cancelled) {
          return;
        }

        const resolvedThorName = data.entry?.name ?? null;

        setThorName(resolvedThorName);

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            getThorNameReverseLookupStorageKey(address),
            resolvedThorName ?? '__none__'
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThorName(null);
          // Cache the absence to avoid repeated retries on failure
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(
              getThorNameReverseLookupStorageKey(address),
              '__none__'
            );
          }
        }
      });
    return () => { cancelled = true; };
  }, [address]);

  if (!hasAddress) {
    return (
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onCloseAction={() => setSidebarOpen(false)} />
        <main className="flex-1 flex items-center justify-center p-4">
          <p className="text-zinc-500">No address provided. Go back to the home page.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <Sidebar isOpen={sidebarOpen} onCloseAction={() => setSidebarOpen(false)} />
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-lg px-3 sm:px-4 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 md:-mt-6 pt-3 sm:pt-4 md:pt-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <MobileMenuButton onClickAction={() => setSidebarOpen(true)} isOpen={sidebarOpen} />
            <div className="min-w-0">
              <Breadcrumbs />
              {address && (
                <>
                  <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 font-mono mt-0.5 truncate" title={address}>
                    {thorName || truncateAddress(address)}
                  </p>
                  {balance !== null && balance > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                      Wallet: <span className="font-mono">{formatRuneFromNumber(balance)}</span>
                    </span>
                  )}
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 sm:hidden">
                    <Wifi className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {getCompactFreshnessLabel(freshnessLabel)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-full">
              <Wifi className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span className="font-medium">{freshnessLabel}</span>
            </span>
            <span className="hidden sm:inline-flex">
              <ChurnCountdown />
            </span>
            <WalletConnect />
            <Button
              variant="glass"
              size="icon"
              onClick={handleRefresh}
              title="Refresh data"
              aria-label="Refresh dashboard data"
              className="bg-white/80 dark:bg-zinc-800/80"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ApiHealthBanner midgard={midgard} thornode={thornode} />
        {children}
      </main>
    </div>
  );
}
