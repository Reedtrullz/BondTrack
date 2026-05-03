'use client';

import React, { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { cn } from '@/lib/utils';
import { useNodeRankings } from '@/lib/hooks/use-node-rankings';
import { AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RiskExposureSummaryProps {
  positions: BondPosition[];
}

export function RiskExposureSummary({ positions }: RiskExposureSummaryProps) {
  const rankings = useNodeRankings(positions);

  const exposure = useMemo(() => {
    const stats = {
      safe: { bond: 0, count: 0 },
      warning: { bond: 0, count: 0 },
      critical: { bond: 0, count: 0 },
    };

    positions.forEach((pos) => {
      const rankData = rankings.find(r => r.nodeAddress === pos.nodeAddress);
      
      // Determine Risk Level
      let level: 'safe' | 'warning' | 'critical' = 'safe';
      
      // High Risk: Bottom 33% rank OR High Slashes (>200)
      if ((rankData && rankData.percentile < 33) || pos.slashPoints >= 200) {
        level = 'critical';
      } else if (rankData && rankData.percentile < 66 || pos.slashPoints >= 50) {
        level = 'warning';
      }

      stats[level].bond += pos.bondAmount;
      stats[level].count += 1;
    });

    return stats;
  }, [positions, rankings]);

  if (positions.length === 0) return null;

  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);

  return (
    <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Risk Exposure</h3>
          <p className="text-xs text-zinc-500">Capital allocation by risk level</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{totalBonded.toLocaleString()}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Total Bonded RUNE</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Safe Zone */}
        <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Safe Zone</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {exposure.safe.bond.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600/70 uppercase font-medium">
            {exposure.safe.count} Node{exposure.safe.count !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Warning Zone */}
        <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Warning</span>
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
            {exposure.warning.bond.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-600/70 uppercase font-medium">
            {exposure.warning.count} Node{exposure.warning.count !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Critical Zone */}
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400">Critical Zone</span>
          </div>
          <div className="text-xl font-bold text-red-700 dark:text-red-300">
            {exposure.critical.bond.toLocaleString()}
          </div>
          <div className="text-[10px] text-red-600/70 uppercase font-medium">
            {exposure.critical.count} Node{exposure.critical.count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {exposure.critical.bond > 0 
              ? `You have ${exposure.critical.bond.toLocaleString()} RUNE exposed to high-risk positions. Consider diversifying or unbonding from critical nodes.`
              : `Your portfolio is well-diversified. No high-risk exposures detected.`}
          </p>
        </div>
      </div>
    </div>
  );
}
