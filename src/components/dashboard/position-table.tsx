import { useMemo, Fragment } from 'react';
import type { BondPosition, YieldGuardFlag } from '@/lib/types/node';
import { ExportButton } from '@/components/shared/export-button';
import { formatRuneAmount, formatRuneWithUnit } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/status-badge';
import { PooledNodeDetails } from './pooled-node-details';
import { AlertTriangle, TrendingDown, Clock, UserMinus, Gauge } from 'lucide-react';

interface PositionTableProps {
  positions: BondPosition[];
}

const YIELD_GUARD_LABELS: Record<YieldGuardFlag, { label: string; icon: React.ReactNode; color: string; tooltip: string }> = {
  overbonded: {
    label: 'Overbonded',
    icon: <Gauge className="w-3 h-3" />,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    tooltip: 'Node is at or above optimal bond - no additional yield',
  },
  highest_slash: {
    label: 'High Slash',
    icon: <AlertTriangle className="w-3 h-3" />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    tooltip: 'Highest slash points in network - may churn soon',
  },
  lowest_bond: {
    label: 'Lowest Bond',
    icon: <TrendingDown className="w-3 h-3" />,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    tooltip: 'Lowest bond in active set - likely next to churn',
  },
  oldest: {
    label: 'Oldest',
    icon: <Clock className="w-3 h-3" />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    tooltip: 'Longest time in active set - expected to rotate out',
  },
  leaving: {
    label: 'Leaving',
    icon: <UserMinus className="w-3 h-3" />,
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    tooltip: 'Node operator requested to leave network',
  },
};

function YieldGuardBadge({ flags }: { flags: YieldGuardFlag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {flags.map((flag) => {
        const config = YIELD_GUARD_LABELS[flag];
        return (
          <span
            key={flag}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.color}`}
            title={config.tooltip}
          >
            {config.icon}
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

export function PositionTable({ positions }: PositionTableProps) {
  const totalBonded = useMemo(
    () => positions.reduce((sum, p) => sum + p.bondAmount, 0),
    [positions]
  );

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No bonded positions found for this address.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Bonded Positions
      </h2>
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <span className="text-sm text-zinc-500">
            {positions.length} node{positions.length !== 1 ? 's' : ''} · {totalBonded.toFixed(2)} RUNE total
          </span>
          <ExportButton bondPositions={positions} />
        </div>
      </div>
      </div>

      <div className="block md:hidden space-y-3">
        {positions.map((pos) => (
          <div key={pos.nodeAddress} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-8)}
                </div>
                <div className="text-xs text-zinc-400">v{pos.version}</div>
                {pos.yieldGuardFlags && pos.yieldGuardFlags.length > 0 && (
                  <YieldGuardBadge flags={pos.yieldGuardFlags} />
                )}
              </div>
              <StatusBadge status={pos.status} isJailed={pos.isJailed} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-500">Bond</div>
                <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {pos.bondAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Share</div>
                <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {pos.bondSharePercent.toFixed(2)}%
                </div>
                <div className="mt-1 w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pos.bondSharePercent, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Fee</div>
                <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {pos.operatorFeeFormatted}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Est. APY</div>
                <div className="font-mono text-sm font-medium text-emerald-600">
                  {pos.netAPY.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Node</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Status</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Pooled</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Bond</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Share</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Fee</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Est. APY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {positions.map((pos) => (
              <tr key={pos.nodeAddress} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-8)}
                  </div>
                  <div className="text-xs text-zinc-400">v{pos.version}</div>
                  {pos.yieldGuardFlags && pos.yieldGuardFlags.length > 0 && (
                    <YieldGuardBadge flags={pos.yieldGuardFlags} />
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <StatusBadge status={pos.status} isJailed={pos.isJailed} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {pos.pooledNodeData?.isPooled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      Pooled
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {pos.bondAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                      {pos.bondSharePercent.toFixed(2)}%
                    </span>
                    <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(pos.bondSharePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {pos.operatorFeeFormatted}
                </td>
                <td className="px-3 py-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                  {pos.netAPY.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
