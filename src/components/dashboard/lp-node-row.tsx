import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { formatRuneAmount } from '../../lib/utils/formatters';
import { LpStatusBadge } from './lp-status-badge';

function formatLiquidityUnits(raw: string): string {
  try {
    return BigInt(raw).toLocaleString('en-US');
  } catch {
    return '0';
  }
}

function formatMemberDate(raw: string): string {
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return '--';
  }

  const timestamp = value > 1e12 ? value / 1e9 : value;
  return new Date(timestamp * 1000).toLocaleDateString();
}

interface LpNodeRowProps {
  position: LpPosition;
}

export const LpNodeRow: React.FC<LpNodeRowProps> = ({ position }) => {
  return (
    <tr className="border-b border-zinc-100 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{position.pool}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{position.address.slice(0, 6)}...{position.address.slice(-4)}</span>
          {position.hasPending ? (
            <span className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Pending add</span>
          ) : null}
        </div>
      </td>
      <td className="py-4 px-4">
        <LpStatusBadge status={position.poolStatus} />
      </td>
      <td className="py-4 px-4 font-medium text-zinc-900 dark:text-zinc-100">
        {formatRuneAmount(position.runeDeposit)}
      </td>
      <td className="py-4 px-4">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{position.ownershipPercent.toFixed(2)}%</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatLiquidityUnits(position.liquidityUnits)} units</div>
      </td>
      <td className="py-4 px-4">
        <span className="font-semibold text-green-600 dark:text-green-400">{position.poolApy.toFixed(2)}%</span>
      </td>
      <td className="py-4 px-4 font-medium text-zinc-900 dark:text-zinc-100">
        {formatRuneAmount(position.volume24h)}
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-zinc-900 dark:text-zinc-100">{formatMemberDate(position.dateFirstAdded)}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Last {formatMemberDate(position.dateLastAdded)}</div>
      </td>
    </tr>
  );
};
