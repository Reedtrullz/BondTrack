'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { mutate } from 'swr';
import { RefreshCw, Clock } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '@/components/layout/sidebar';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { Button } from '@/components/ui/button';
import { getTHORNameReverseLookup } from '@/lib/api/midgard';

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
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const [thorName, setThorName] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    SWR_KEYS.forEach((key) => mutate(key));
    setLastUpdated(Date.now());
  }, []);

  const elapsed = Date.now() - lastUpdated;
  const freshnessLabel = formatElapsed(elapsed);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    getTHORNameReverseLookup(address)
      .then((data) => {
        if (!cancelled && data.entry?.name) {
          setThorName(data.entry.name);
        }
      })
      .catch(() => {
        // Silently fall back to address
      });
    return () => { cancelled = true; };
  }, [address]);

  if (!address) {
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
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Dashboard
              </h1>
              <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 font-mono mt-0.5 truncate" title={address}>
                {thorName || truncateAddress(address)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <Clock className="h-3 w-3" />
              {freshnessLabel}
            </span>
            <WalletConnect />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              title="Refresh data"
              aria-label="Refresh dashboard data"
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
