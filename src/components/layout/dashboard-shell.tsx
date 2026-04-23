'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { mutate } from 'swr';
import { RefreshCw, Clock, Wifi } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '@/components/layout/sidebar';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { getTHORNameReverseLookupNoRetry as getTHORNameReverseLookup } from '@/lib/api/midgard';

const THORNAME_CACHE_PREFIX = 'thorname-rlookup:';

const SWR_KEYS = [
  'nodes',
  'earnings-history',
  'rune-price',
  'network-constants',
];

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
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
  const [tick, setTick] = useState(0);
  const [tickAtRefresh, setTickAtRefresh] = useState(0);

  const hasAddress = requireAddress ? !!address : true;

  const elapsedMs = (tick - tickAtRefresh) * 10_000;
  const freshnessLabel = formatElapsed(elapsedMs);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    SWR_KEYS.forEach((key) => mutate(key));
    setTickAtRefresh(tick);
    setTick((t) => t + 1);
  }, [tick]);

  useEffect(() => {
    if (!address) {
      setThorName(null);
      return;
    }

    let cancelled = false;

    if (typeof window !== 'undefined') {
      const cachedThorName = sessionStorage.getItem(`${THORNAME_CACHE_PREFIX}${address}`);

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
            `${THORNAME_CACHE_PREFIX}${address}`,
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
              `${THORNAME_CACHE_PREFIX}${address}`,
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
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 flex items-center justify-center p-4">
          <p className="text-zinc-500">No address provided. Go back to the home page.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-lg px-3 sm:px-4 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 md:-mt-6 pt-3 sm:pt-4 md:pt-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <div className="min-w-0">
              <Breadcrumbs />
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Dashboard
              </h1>
              {address && (
                <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 font-mono mt-0.5 truncate" title={address}>
                  {thorName || truncateAddress(address)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-full">
              <Wifi className="h-3 w-3 text-emerald-500" />
              <Clock className="h-3 w-3" />
              <span className="font-medium">{freshnessLabel}</span>
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
        {children}
      </main>
    </div>
  );
}
