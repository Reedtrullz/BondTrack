import React from 'react';
import { LpPosition } from '../../lib/types/lp';
import { LpStatusBadge } from './lp-status-badge';

interface LpNodeRowProps {
  position: LpPosition;
}

export const LpNodeRow: React.FC<LpNodeRowProps> = ({ position }) => {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{position.pool}</span>
          <span className="text-xs text-gray-500">{position.address.slice(0, 6)}...{position.address.slice(-4)}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <LpStatusBadge status={position.status} />
      </td>
      <td className="py-4 px-4 font-medium text-gray-900">
        {position.bondedRune}
      </td>
      <td className="py-4 px-4">
        <span className="text-green-600 font-semibold">{position.apy.toFixed(2)}%</span>
      </td>
      <td className="py-4 px-4">
        <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
          <div
            className={`h-2 rounded-full ${position.healthScore > 70 ? 'bg-green-500' : position.healthScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${position.healthScore}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{position.healthScore}/100</span>
      </td>
      <td className="py-4 px-4 text-right">
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          Details
        </button>
      </td>
    </tr>
  );
};