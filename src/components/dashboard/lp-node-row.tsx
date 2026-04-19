import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { LpStatusBadge } from './lp-status-badge';

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
        </div>
      </td>
      <td className="py-4 px-4">
        <LpStatusBadge status={position.status} />
      </td>
      <td className="py-4 px-4 font-medium text-zinc-900 dark:text-zinc-100">
        {position.bondedRune}
      </td>
      <td className="py-4 px-4">
        <span className="font-semibold text-green-600 dark:text-green-400">{position.apy.toFixed(2)}%</span>
      </td>
      <td className="py-4 px-4">
        <div className="h-2 max-w-[100px] w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={`h-2 rounded-full ${position.healthScore > 70 ? 'bg-green-500' : position.healthScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${position.healthScore}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{position.healthScore}/100</span>
      </td>
      <td className="py-4 px-4 text-right">
        <button className="text-sm font-medium text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200">
          Details
        </button>
      </td>
    </tr>
  );
};