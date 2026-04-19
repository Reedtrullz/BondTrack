import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { formatRuneAmount } from '../../lib/utils/formatters';
import { formatPnlDisplay } from '../../lib/utils/calculations';

interface LpDepositWithdrawBreakdownProps {
  position: LpPosition;
}

export const LpDepositWithdrawBreakdown: React.FC<LpDepositWithdrawBreakdownProps> = ({ position }) => {
  const pnlDisplay = formatPnlDisplay(position.netProfitLossPercent);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Deposit/Withdraw Breakdown</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Detailed breakdown of {position.pool} liquidity position</p>
      </div>

      {/* Deposit Summary */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Deposited Amounts</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">RUNE</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeDeposit)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ASSET 2</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.asset2Deposit)}</span>
          </div>
        </div>
      </div>

      {/* Withdrawable Summary */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Withdrawable Amounts</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg dark:bg-green-900/20">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">RUNE</span>
            <span className="text-sm font-bold text-green-900 dark:text-green-100">{formatRuneAmount(position.runeWithdrawable)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg dark:bg-green-900/20">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">ASSET 2</span>
            <span className="text-sm font-bold text-green-900 dark:text-green-100">{formatRuneAmount(position.asset2Withdrawable)}</span>
          </div>
        </div>
      </div>

      {/* Activity History */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Activity History</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">RUNE Added</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeAdded)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">RUNE Withdrawn</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.runeWithdrawn)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ASSET 2 Added</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.asset2Added)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ASSET 2 Withdrawn</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRuneAmount(position.asset2Withdrawn)}</span>
          </div>
        </div>
      </div>

      {/* Pending Amounts */}
      {position.hasPending && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-amber-800 dark:text-amber-200 mb-3">Pending Amounts</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg dark:bg-amber-900/20">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">RUNE Pending</span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{formatRuneAmount(position.runePending)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg dark:bg-amber-900/20">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">ASSET 2 Pending</span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{formatRuneAmount(position.asset2Pending)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Profit/Loss */}
      <div>
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Performance</h4>
        <div className="space-y-3">
          <div className={`flex justify-between items-center p-3 rounded-lg ${pnlDisplay.color.replace('text-', 'bg-').replace('dark:', 'dark:')} bg-opacity-10`}>
            <span className="text-sm font-medium">Net Profit/Loss</span>
            <span className={`text-sm font-bold ${pnlDisplay.color}`}>{position.netProfitLoss}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-lg ${pnlDisplay.color.replace('text-', 'bg-').replace('dark:', 'dark:')} bg-opacity-10`}>
            <span className="text-sm font-medium">PnL Percentage</span>
            <span className={`text-sm font-bold ${pnlDisplay.color}`}>{position.netProfitLossPercent.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pool APY</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">{position.poolApy.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};