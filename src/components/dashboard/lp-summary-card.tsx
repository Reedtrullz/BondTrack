import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { LpStatusBadge } from './lp-status-badge';

export const LpSummaryCard: React.FC<{ position: LpPosition }> = ({ position }) => {
  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Pool</p>
          <p className="text-lg font-bold text-gray-900">{position.pool}</p>
        </div>
        <LpStatusBadge status={position.status} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
        <div>
          <p className="text-sm text-gray-500">Bonded RUNE</p>
          <p className="text-xl font-semibold">{position.bondedRune}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">APY</p>
          <p className="text-xl font-semibold">{position.apy.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Health Score</p>
          <p className={`text-xl font-semibold ${getHealthColor(position.healthScore)}`}>
            {position.healthScore}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Slash Risk</p>
          <p className="text-xl font-semibold">{position.slashRisk.toFixed(1)}%</p>
        </div>
      </div>
      {position.unbondWindowRemaining > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Unbond Window</p>
          <p className="text-lg font-medium">{position.unbondWindowRemaining}h remaining</p>
        </div>
      )}
    </div>
  );
};