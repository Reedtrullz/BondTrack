'use client';

import { useEffect, useState } from 'react';
import { getNetworkConstants, getAllNodes } from '@/lib/api/thornode';
import { formatCompactNumber } from '@/lib/utils/formatters';
import { NETWORK } from '@/lib/config';
import { Activity, Shield, Clock, Hash, AlertTriangle } from 'lucide-react';
import type { NetworkConstantsRaw, NodeRaw } from '@/lib/api/thornode';

interface NetworkHealthData {
  blockHeight: number;
  activeValidators: number;
  nextChurnBlocks: number;
  nextChurnSeconds: number;
  securityLevel: 'critical' | 'warning' | 'healthy' | 'optimal';
}

function getSecurityLevel(activeCount: number): 'critical' | 'warning' | 'healthy' | 'optimal' {
  const desired = NETWORK.DESIRED_VALIDATOR_SET;
  const ratio = activeCount / desired;
  if (ratio >= 0.9) return 'optimal';
  if (ratio >= 0.6) return 'healthy';
  if (ratio >= 0.33) return 'warning';
  return 'critical';
}

function getSecurityColor(level: string): string {
  switch (level) {
    case 'optimal': return 'text-emerald-600 dark:text-emerald-400';
    case 'healthy': return 'text-blue-600 dark:text-blue-400';
    case 'warning': return 'text-amber-600 dark:text-amber-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
    default: return 'text-zinc-600 dark:text-zinc-400';
  }
}

function getSecurityBg(level: string): string {
  switch (level) {
    case 'optimal': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    case 'healthy': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    default: return 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800';
  }
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Imminent';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function NetworkHealth() {
  const [data, setData] = useState<NetworkHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [constants, nodes] = await Promise.all([
          getNetworkConstants(),
          getAllNodes(),
        ]);

        const blockHeight = constants.int_64_values?.['block_height'] ?? 0;
        const activeNodes = nodes.filter((n: NodeRaw) => n.status === 'active');
        const activeValidators = activeNodes.length;

        const blocksSinceChurn = blockHeight % NETWORK.CHURN_INTERVAL_BLOCKS;
        const nextChurnBlocks = NETWORK.CHURN_INTERVAL_BLOCKS - blocksSinceChurn;
        const nextChurnSeconds = nextChurnBlocks * 6;

        const securityLevel = getSecurityLevel(activeValidators);

        setData({
          blockHeight,
          activeValidators,
          nextChurnBlocks,
          nextChurnSeconds,
          securityLevel,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch network data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <div className="animate-pulse h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="animate-pulse h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Error: {error || 'No network data'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Network Health</h3>
        <Activity className="w-4 h-4 text-zinc-400" />
      </div>

      <div className={`p-3 rounded-lg border mb-4 ${getSecurityBg(data.securityLevel)}`}>
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${getSecurityColor(data.securityLevel)}`} />
          <span className={`font-medium capitalize ${getSecurityColor(data.securityLevel)}`}>
            {data.securityLevel}
          </span>
          <span className="text-xs text-zinc-500">
            ({data.activeValidators}/{NETWORK.DESIRED_VALIDATOR_SET} validators)
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Hash className="w-4 h-4" />
            <span>Block Height</span>
          </div>
          <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
            {formatCompactNumber(data.blockHeight)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Shield className="w-4 h-4" />
            <span>Active Validators</span>
          </div>
          <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
            {data.activeValidators}
          </span>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Clock className="w-4 h-4" />
              <span>Next Churn</span>
            </div>
            <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
              {formatCountdown(data.nextChurnSeconds)}
            </span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{
                width: `${((NETWORK.CHURN_INTERVAL_BLOCKS - data.nextChurnBlocks) / NETWORK.CHURN_INTERVAL_BLOCKS) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>{data.nextChurnBlocks.toLocaleString()} blocks remaining</span>
            <span>Every {NETWORK.CHURN_INTERVAL_BLOCKS.toLocaleString()} blocks</span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Refreshes every 60s &middot; Churn interval ~{NETWORK.CHURN_INTERVAL_SECONDS / 86400} days
      </div>
    </div>
  );
}
