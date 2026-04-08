'use client';

import React, { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { cn } from '@/lib/utils';

interface RiskHeatmapProps {
  positions: BondPosition[];
  onNodeSelect: (nodeAddress: string) => void;
}

export function RiskHeatmap({ positions, onNodeSelect }: RiskHeatmapProps) {
  // Define axes buckets
  const xBuckets = ['Low', 'Medium', 'High']; // Churn Risk
  const yBuckets = ['Low', 'Medium', 'High']; // Slash Points

  const heatmapData = useMemo(() => {
    const grid: Record<string, string[]> = {};

    positions.forEach((pos) => {
      // Determine X (Churn Risk)
      let xIndex = 0; // Low
      if (pos.yieldGuardFlags?.includes('lowest_bond')) {
        xIndex = 2; // High
      } else if (pos.bondSharePercent < 0.01) { // Heuristic for medium risk
        xIndex = 1; // Medium
      }

      // Determine Y (Slash Points)
      let yIndex = 0; // Low
      if (pos.slashPoints >= 200) {
        yIndex = 2; // High
      } else if (pos.slashPoints >= 50) {
        yIndex = 1; // Medium
      }

      const key = `${xIndex}-${yIndex}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(pos.nodeAddress);
    });

    return grid;
  }, [positions]);

  const getColor = (x: number, y: number) => {
    const score = x + y; // 0 (Low/Low) to 4 (High/High)
    if (score <= 1) return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400';
    if (score <= 3) return 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400';
    return 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Risk Distribution</h3>
          <p className="text-xs text-zinc-500">Slashes vs. Churn Risk</p>
        </div>
        <div className="flex gap-3 text-[10px] font-medium uppercase">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Safe</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Warning</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="relative aspect-square max-w-md mx-auto">
          {/* Y-Axis Labels */}
          <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between py-2 text-[10px] text-zinc-400 font-bold uppercase">
            <span>High</span>
            <span>Med</span>
            <span>Low</span>
          </div>

          {/* Heatmap Grid */}
          <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full w-full">
            {yBuckets.slice().reverse().map((_, y) => (
              xBuckets.map((_, x) => {
                const key = `${x}-${y === 0 ? 2 : y === 1 ? 1 : 0}`; // Adjusted for reverse Y
                const nodesInCell = heatmapData[key] || [];
                const color = getColor(x, y === 0 ? 2 : y === 1 ? 1 : 0);

                return (
                  <div 
                    key={`${x}-${y}`}
                    onClick={() => nodesInCell.length > 0 && onNodeSelect(nodesInCell[0])}
                    className={cn(
                      "relative rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden group",
                      color,
                      nodesInCell.length > 0 ? "hover:scale-105 hover:shadow-lg" : "opacity-30"
                    )}
                  >
                    {nodesInCell.length > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold">{nodesInCell.length}</span>
                        <span className="text-[8px] uppercase font-bold opacity-70">Nodes</span>
                      </div>
                    )}
                    {/* Hover Tooltip */}
                    {nodesInCell.length > 0 && (
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                );
              })
            ))}
          </div>

          {/* X-Axis Labels */}
          <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-2 text-[10px] text-zinc-400 font-bold uppercase">
            <span>Low</span>
            <span>Med</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
