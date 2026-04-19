import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { LpStatusBadge } from './lp-status-badge';

export const LpSummaryCard: React.FC<{ position: LpPosition }> = ({ position }) => {
  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500 dark:text-green-400';
    if (score >= 40) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-red-500 dark:text-red-400';
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pool</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{position.pool}</p>
        </div>
        <LpStatusBadge status={position.status} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Bonded RUNE</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{position.bondedRune}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">APY</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">{position.apy.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Health Score</p>
          <p className={`text-xl font-semibold ${getHealthColor(position.healthScore)}`}>
            {position.healthScore}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Slash Risk</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{position.slashRisk.toFixed(1)}%</p>
        </div>
      </div>
      {position.unbondWindowRemaining > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Unbond Window</p>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{position.unbondWindowRemaining}h remaining</p>
        </div>
      )}
    </div>
  );
};