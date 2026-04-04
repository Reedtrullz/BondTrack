'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { mutate } from 'swr';
import { RefreshCw } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '@/components/layout/sidebar';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { Button } from '@/components/ui/button';

const SWR_KEYS = [
  'nodes',
  'earnings-history',
  'rune-price',
  'network-constants',
];

function handleRefresh() {
  SWR_KEYS.forEach((key) => mutate(key));
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

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
                {address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <WalletConnect />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              title="Refresh data"
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
