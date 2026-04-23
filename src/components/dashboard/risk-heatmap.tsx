'use client';

import React, { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { cn } from '@/lib/utils';
import { useNodeRankings } from '@/lib/hooks/use-node-rankings';
import { AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RiskHeatmapProps {
  positions: BondPosition[];
  onNodeSelect: (nodeAddress: string) => void;
}

export function RiskHeatmap({ positions, onNodeSelect }: RiskHeatmapProps) {
  const rankings = useNodeRankings(positions);

  const xBuckets = ['Low', 'Medium', 'High']; // Churn Risk (Percentile)
  const yBuckets = ['Low', 'Medium', 'High']; // Slash Points

  const heatmapData = useMemo(() => {
    const grid: Record<string, { nodes: string[]; totalBond: number }> = {};

    positions.forEach((pos) => {
      const rankData = rankings.find(r => r.nodeAddress === pos.nodeAddress);
      
      // X: Churn Risk based on percentile (Rankings hook)
      // 0-33% = High Risk, 33-66% = Med, 66-100% = Low
      let xIndex = 0; // Low
      if (rankData) {
        if (rankData.percentile < 33) xIndex = 2; // High
        else if (rankData.percentile < 66) xIndex = 1; // Medium
      } else {
        // Fallback if ranking not yet available
        xIndex = pos.yieldGuardFlags?.includes('lowest_bond') ? 2 : 1;
      }

      // Y: Slash Points (Absolute thresholds)
      let yIndex = 0; // Low
      if (pos.slashPoints >= 200) {
        yIndex = 2; // High
      } else if (pos.slashPoints >= 50) {
        yIndex = 1; // Medium
      }

      const key = `${xIndex}-${yIndex}`;
      if (!grid[key]) grid[key] = { nodes: [], totalBond: 0 };
      grid[key].nodes.push(pos.nodeAddress);
      grid[key].totalBond += pos.bondAmount;
    });

    return grid;
  }, [positions, rankings]);

  const getColor = (x: number, y: number) => {
    const score = x + y; 
    if (score <= 1) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
    if (score <= 3) return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
    return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
  };

  const formatRune = (val: number) => {
    if (val >= 1000) return `${(val/1000).toFixed(1)}k`;
    return val.toFixed(0);
  };

  return (
    <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Capital Exposure Map</h3>
          <p className="text-xs text-zinc-500">Bond Amount by Slash vs. Churn Risk</p>
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
                const realY = y === 0 ? 2 : y === 1 ? 1 : 0;
                const key = `${x}-${realY}`;
                const cell = heatmapData[key] || { nodes: [], totalBond: 0 };
                const color = getColor(x, realY);

                return (
                  <div 
                    key={`${x}-${y}`}
                    onClick={() => cell.nodes.length > 0 && onNodeSelect(cell.nodes[0])}
                    className={cn(
                      "relative rounded-lg border-2 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group",
                      color,
                      cell.nodes.length > 0 ? "hover:scale-105 hover:shadow-lg" : "opacity-30"
                    )}
                  >
                    {cell.nodes.length > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold leading-none">{formatRune(cell.totalBond)}</span>
                        <span className="text-[9px] uppercase font-bold opacity-60">RUNE</span>
                        <div className="mt-1 px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/30 text-[8px] font-bold">
                          {cell.nodes.length} Nodes
                        </div>
                      </div>
                    )}
                    {/* Critical Zone Highlight */}
                    {x === 2 && realY === 2 && cell.nodes.length > 0 && (
                      <div className="absolute top-1 right-1">
                        <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </div>
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
      
      <div className="mt-12 grid grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Safe Zone</span>
          </div>
          <p className="text-[10px] text-zinc-500">Low slash points & high ranking.</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Monitoring</span>
          </div>
          <p className="text-[10px] text-zinc-500">Moderate risk of churn or slashes.</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Exit Zone</span>
          </div>
          <p className="text-[10px] text-zinc-500">High churn risk. Consider unbonding.</p>
        </div>
      </div>
    </div>
  );
}
