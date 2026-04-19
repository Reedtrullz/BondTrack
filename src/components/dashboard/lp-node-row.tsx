import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { formatRuneAmount } from '../../lib/utils/formatters';
import { LpStatusBadge } from './lp-status-badge';
import { formatPnlDisplay } from '../../lib/utils/calculations';

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

function safeToFixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(decimals);
}

export const LpNodeRow: React.FC<LpNodeRowProps> = ({ position }) => {
  const pnlDisplay = formatPnlDisplay(position?.netProfitLossPercent ?? 0);
  const safeAddress = position?.address ?? '';
  const safeOwnership = position?.ownershipPercent ?? 0;
  const safePoolApy = position?.poolApy ?? 0;
  
  return (
    <tr className="border-b border-zinc-100 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{position.pool}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{safeAddress.length >= 10 ? `${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}` : '--'}</span>
          {position.hasPending ? (
            <span className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Pending add</span>
          ) : null}
        </div>
      </td>
      <td className="py-4 px-4">
        <LpStatusBadge status={position.poolStatus} />
      </td>
      
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            RUNE: {formatRuneAmount(position.runeDeposit)}
          </div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            ASSET: {formatRuneAmount(position.asset2Deposit)}
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{safeToFixed(safeOwnership, 2)}%</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatLiquidityUnits(position.liquidityUnits)} units</div>
      </td>
      
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className="font-semibold text-green-600 dark:text-green-400">
            RUNE: {formatRuneAmount(position.runeWithdrawable)}
          </div>
          <div className="font-semibold text-green-600 dark:text-green-400">
            ASSET: {formatRuneAmount(position.asset2Withdrawable)}
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className={`font-semibold ${pnlDisplay.color}`}>
            {position.netProfitLoss}
          </div>
          <div className={`text-sm ${pnlDisplay.color}`}>
            {safeToFixed(pnlDisplay.color ? position.netProfitLossPercent : 0, 2)}%
          </div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="space-y-2">
          <div className="font-semibold text-green-600 dark:text-green-400">{safeToFixed(safePoolApy, 2)}%</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">APY</div>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="space-y-1">
          <div className="text-sm text-zinc-900 dark:text-zinc-100">{formatMemberDate(position.dateFirstAdded)}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Last {formatMemberDate(position.dateLastAdded)}</div>
          <div className="text-xs text-amber-600 dark:text-amber-400">
            {position.hasPending ? 'Pending' : 'Active'}
          </div>
        </div>
      </td>
    </tr>
  );
};
