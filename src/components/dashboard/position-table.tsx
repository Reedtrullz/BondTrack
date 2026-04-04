import { useMemo } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { ExportButton } from '@/components/shared/export-button';
import { formatRuneAmount, formatRuneWithUnit } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/status-badge';

interface PositionTableProps {
  positions: BondPosition[];
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

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Node</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Status</th>
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
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <StatusBadge status={pos.status} isJailed={pos.isJailed} />
                </td>
                <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {pos.bondAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {pos.bondSharePercent.toFixed(2)}%
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
