'use client';

import { useMemo } from 'react';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { runeToNumber } from '@/lib/utils/formatters';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface NetworkAverages {
  avgBond: number;
  avgSlashPoints: number;
  avgOperatorFee: number;
  activeNodeCount: number;
}

function MetricRowMobile({ label, yourValue, avgValue, indicator }: { label: string; yourValue: string; avgValue: string; indicator: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-zinc-900 dark:text-zinc-100">{yourValue}</span>
        <span className="font-mono text-zinc-500 text-xs">{avgValue}</span>
      </div>
      <div>{indicator}</div>
    </div>
  );
}

function ComparisonIndicator({ userValue, avgValue, format }: { userValue: number; avgValue: number; format: (v: number) => string }) {
  const diff = userValue - avgValue;
  const percentDiff = avgValue !== 0 ? ((diff / avgValue) * 100) : 0;

  if (Math.abs(percentDiff) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-zinc-500 text-xs">
        <Minus className="w-3 h-3" />
        ~{format(avgValue)}
      </span>
    );
  }

  const isAbove = diff > 0;
  const color = isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const Icon = isAbove ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {format(userValue)} ({isAbove ? '+' : ''}{percentDiff.toFixed(1)}%)
    </span>
  );
}

export function NetworkComparisonTable({ address }: { address: string | null }) {
  const { data: allNodes, isLoading: isLoadingAll } = useAllNodes();
  const { positions, isLoading: isLoadingPositions } = useBondPositions(address);

  const networkAverages: NetworkAverages | null = useMemo(() => {
    if (!allNodes || allNodes.length === 0) return null;
    const activeNodes = allNodes.filter(n => n.status === 'Active');
    if (activeNodes.length === 0) return null;
    const totalBond = activeNodes.reduce((sum, n) => sum + runeToNumber(n.total_bond), 0);
    const totalSlash = activeNodes.reduce((sum, n) => sum + n.slash_points, 0);
    const totalFee = activeNodes.reduce((sum, n) => sum + Number(n.bond_providers?.node_operator_fee || 0), 0);
    const count = activeNodes.length;
    return {
      avgBond: totalBond / count,
      avgSlashPoints: totalSlash / count,
      avgOperatorFee: totalFee / count,
      activeNodeCount: count,
    };
  }, [allNodes]);

  if (isLoadingAll || isLoadingPositions) return null;
  if (!networkAverages || positions.length === 0) return null;

  const formatRune = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatSlash = (v: number) => v.toFixed(1);
  const formatFee = (v: number) => `${(v / 100).toFixed(2)}%`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Network Comparison</h2>
        <p className="text-sm text-zinc-500">Your nodes vs network averages ({networkAverages.activeNodeCount} active nodes)</p>
      </div>
      <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Metric</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">Your Node</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">Network Avg</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {positions.map((pos) => (
              <React.Fragment key={pos.nodeAddress}>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50">
                  <td colSpan={4} className="px-4 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-8)}
                  </td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">Bond Amount</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100">{formatRune(pos.bondAmount)} RUNE</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-500">{formatRune(networkAverages.avgBond)} RUNE</td>
                  <td className="px-4 py-3 text-right">
                    <ComparisonIndicator userValue={pos.bondAmount} avgValue={networkAverages.avgBond} format={(v) => `${formatRune(v)} RUNE`} />
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
