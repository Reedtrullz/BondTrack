'use client';

import { useMemo } from 'react';
import type { BondPosition, YieldGuardFlag } from '@/lib/types/node';
import { formatRuneDisplayNumber, formatRuneFromNumber, formatPercent } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/shared/badge';
import { AlertTriangle, TrendingDown, Clock, UserMinus, Inbox } from 'lucide-react';
import { MetricTooltip, METRIC_EXPLANATIONS } from '@/components/shared/metric-tooltip';

interface PositionTableProps {
  positions: BondPosition[];
}

const YIELD_GUARD_LABELS: Record<YieldGuardFlag, { label: string; icon: React.ReactNode; color: string; tooltip: string }> = {
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
          <Badge
            key={flag}
            className={config.color}
            icon={config.icon}
            title={config.tooltip}
          >
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}

function isUsablePositionNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function formatPositionRune(value: number): string {
  return isUsablePositionNumber(value) ? formatRuneDisplayNumber(value) : '--';
}

function formatPositionPercent(value: number): string {
  return isUsablePositionNumber(value) ? formatPercent(value) : '--';
}

function getShareBarWidth(value: number): string {
  if (!isUsablePositionNumber(value)) return '0%';
  return `${Math.min(value, 100)}%`;
}

export function PositionTable({ positions }: PositionTableProps) {
  const totalBonded = useMemo(() => {
    const hasInvalidBond = positions.some((position) => !isUsablePositionNumber(position.bondAmount));
    if (hasInvalidBond) return null;

    return positions.reduce((sum, position) => sum + position.bondAmount, 0);
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="mb-4">
          <Inbox className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          No Bonded Positions
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          This address doesn&apos;t have any active bond positions yet. Bond to a node to start earning rewards and securing the THORChain network.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
          New bonds typically appear within 1-2 churns after the transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Bonded Positions
          </h2>
          <MetricTooltip
            label="Bonded Positions"
            explanation={METRIC_EXPLANATIONS.totalBonded}
            showLabel={false}
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">
            {positions.length} node{positions.length !== 1 ? 's' : ''} ·{' '}
            {totalBonded === null ? 'total unavailable' : `${formatRuneFromNumber(totalBonded)} total`}
          </span>
        </div>
      </div>

      <div className="block md:hidden space-y-3">
        {positions.map((pos) => (
          <div key={pos.nodeAddress} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-8)}
                </div>
                <div className="text-xs text-zinc-400 mt-1">v{pos.version}</div>
                {pos.yieldGuardFlags && pos.yieldGuardFlags.length > 0 && (
                  <YieldGuardBadge flags={pos.yieldGuardFlags} />
                )}
              </div>
              <StatusBadge status={pos.status} isJailed={pos.isJailed} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">Bond</div>
                <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {formatPositionRune(pos.bondAmount)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  Share
                  <MetricTooltip
                    label="Bond Share"
                    explanation={METRIC_EXPLANATIONS.bondShare}
                    showLabel={false}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                    {formatPositionPercent(pos.bondSharePercent)}
                  </span>
                  <div className="w-12 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: getShareBarWidth(pos.bondSharePercent) }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">Fee</div>
                <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {pos.operatorFeeFormatted}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  Est. APY
                  <MetricTooltip
                    label="Estimated APY"
                    explanation={METRIC_EXPLANATIONS.weightedApy}
                    showLabel={false}
                  />
                </div>
                <div className="font-mono text-sm font-medium text-emerald-600">
                  {formatPositionPercent(pos.netAPY)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Node</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Status</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Pooled</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Bond</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Share</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Fee</th>
              <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap flex items-center justify-end gap-1">
                Est. APY
                <MetricTooltip
                  label="Estimated APY"
                  explanation={METRIC_EXPLANATIONS.weightedApy}
                  showLabel={false}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {positions.map((pos) => (
              <tr key={pos.nodeAddress} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-3 py-3 whitespace-nowrap align-middle">
                  <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-8)}
                  </div>
                  <div className="text-xs text-zinc-400">v{pos.version}</div>
                  {pos.yieldGuardFlags && pos.yieldGuardFlags.length > 0 && (
                    <YieldGuardBadge flags={pos.yieldGuardFlags} />
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap align-middle">
                  <StatusBadge status={pos.status} isJailed={pos.isJailed} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap align-middle">
                  {pos.pooledNodeData?.isPooled && (
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      Pooled
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap align-middle">
                  {formatPositionRune(pos.bondAmount)}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap align-middle">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                      {formatPositionPercent(pos.bondSharePercent)}
                    </span>
                    <div className="w-16 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: getShareBarWidth(pos.bondSharePercent) }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap align-middle">
                  {pos.operatorFeeFormatted}
                </td>
                <td className="px-3 py-3 text-right font-medium text-emerald-600 whitespace-nowrap align-middle">
                  {formatPositionPercent(pos.netAPY)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
