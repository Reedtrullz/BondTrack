import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { formatRuneAmount } from '../../lib/utils/formatters';
import { LpStatusBadge } from './lp-status-badge';
import { formatPnlDisplay } from '../../lib/utils/calculations';
import { getAssetName } from '../../lib/utils/pool';

function formatLiquidityUnits(raw: string): string {
  try {
    return BigInt(raw).toLocaleString('en-US');
  } catch {
    return '0';
  }
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

function formatMemberDate(raw: string): string {
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return '--';
  }

  const timestamp = value > 1e12 ? value / 1e9 : value;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function safeToFixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(decimals);
}

export const LpSummaryCard: React.FC<{ position: LpPosition }> = ({ position }) => {
  const pnlDisplay = formatPnlDisplay(position?.netProfitLossPercent ?? 0);
  const { rune, asset } = getAssetName(position.pool);
  
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pool</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{position.pool}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ownership {formatPercent(position?.ownershipPercent ?? 0)} · LP Units {formatLiquidityUnits(position.liquidityUnits)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LpStatusBadge status={position.poolStatus} />
          {position.hasPending ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Pending Add
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Deposited</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeDeposit)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Deposited</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.asset2Deposit)}</p>
        </div>
        
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Withdrawable</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">{formatRuneAmount(position.runeWithdrawable)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Withdrawable</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">{formatRuneAmount(position.asset2Withdrawable)}</p>
        </div>
        
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Net Profit/Loss</p>
          <p className={`text-xl font-semibold ${pnlDisplay.color}`}>{position.netProfitLoss}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">PnL Percentage</p>
          <p className={`text-xl font-semibold ${pnlDisplay.color}`}>{safeToFixed(position?.netProfitLossPercent ?? 0, 2)}%</p>
        </div>
        
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pool APY</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">{safeToFixed(position?.poolApy ?? 0, 2)}%</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">24H Volume</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.volume24h)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pool Depth</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeDepth)}</p>
        </div>
        
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Added</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeAdded)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">RUNE Withdrawn</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeWithdrawn)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Added</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.asset2Added)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Withdrawn</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.asset2Withdrawn)}</p>
        </div>
        
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">First Added</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatMemberDate(position.dateFirstAdded)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Last Added</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatMemberDate(position.dateLastAdded)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending Amount</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {position.hasPending ? (
              <span className="text-amber-600 dark:text-amber-400">
                {formatRuneAmount(position.runePending)} + {formatRuneAmount(position.asset2Pending)}
              </span>
            ) : '--'}
          </p>
        </div>
      </div>
    </div>
  );
};
