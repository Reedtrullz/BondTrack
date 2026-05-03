'use client';

import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { useChurnCountdown } from '@/lib/hooks/use-churn-countdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Coins, Clock, ExternalLink } from 'lucide-react';
import { runeToNumber } from '@/lib/utils/formatters';
import { formatRuneAmount } from '@/lib/utils/formatters';

export function NetworkStatus() {
  const { data: network, isLoading: networkLoading } = useNetworkMetrics();
  const { data: churn, isLoading: churnLoading } = useChurnCountdown();

  const activeNodes = network ? parseInt(network.activeNodeCount) : 0;
  const totalBonded = network ? runeToNumber(network.totalPooledRune) : 0; // Note: totalPooledRune is across all pools, not total bonded. Use bondMetrics.totalActiveBond instead.
  const totalActiveBond = network ? runeToNumber(network.bondMetrics.totalActiveBond) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
          <Shield className="h-4 w-4 text-[var(--color-primary)]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {networkLoading ? '--' : activeNodes.toLocaleString()}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {networkLoading ? 'Loading...' : `${network?.standbyNodeCount} standby`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bonded</CardTitle>
          <Coins className="h-4 w-4 text-[var(--color-primary)]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {networkLoading ? '--' : formatRuneAmount(network!.bondMetrics.totalActiveBond)}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {networkLoading ? 'Loading...' : `Avg: ${formatRuneAmount(network!.bondMetrics.averageActiveBond)}`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Churn</CardTitle>
          <Clock className="h-4 w-4 text-[var(--color-primary)]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {churnLoading ? '--' : `${churn?.timeRemaining.days}d ${churn?.timeRemaining.hours}h`}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {churnLoading ? 'Loading...' : `${churn?.blocksRemaining} blocks remaining`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resources</CardTitle>
          <ExternalLink className="h-4 w-4 text-[var(--color-primary)]" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Button variant="link" asChild className="justify-start px-0">
              <a href="https://tcecosystem.guide" target="_blank" rel="noopener noreferrer">
                THORChain Ecosystem Guide
              </a>
            </Button>
            <Button variant="link" asChild className="justify-start px-0">
              <a href="https://gitlab.com/thorchain" target="_blank" rel="noopener noreferrer">
                THORChain GitLab
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
