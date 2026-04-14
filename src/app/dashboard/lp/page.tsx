'use client';

import React, { Suspense } from 'react';
import { LpSummaryCard } from '../../../components/dashboard/lp-summary-card';
import { LpNodeRow } from '../../../components/dashboard/lp-node-row';
import { useLpPositions } from '../../../hooks/use-lp-positions';
import { LpPosition } from '../../../lib/types/lp';

const DashboardContent = () => {
  const { positions, isLoading, error } = useLpPositions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-12 bg-red-50 rounded-lg">
        <p className="text-lg font-semibold">Error loading LP positions</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-6">Portfolio Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(positions as LpPosition[]).map((pos) => (
            <LpSummaryCard key={pos.address} position={pos} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Your Liquidity Positions</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Pool</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Bonded RUNE</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">APY</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Health</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {positions.length > 0 ? (
                positions.map((pos: LpPosition) => (
                  <LpNodeRow key={pos.address} position={pos} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No LP positions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const LpDashboardPage = () => {
  return (
    <div className="container mx-auto py-10 px-4">
      <Suspense fallback={<div className="text-center py-20">Loading LP Dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
};

export default LpDashboardPage;
