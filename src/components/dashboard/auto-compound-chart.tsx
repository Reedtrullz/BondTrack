'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Coins } from 'lucide-react';
import { BondPosition } from '@/lib/types/node';

interface CompoundGrowthForecastProps {
  positions: BondPosition[];
  weightedApy: number; // e.g., 0.12 for 12%
}

export function AutoCompoundChart({ positions, weightedApy }: CompoundGrowthForecastProps) {
  const totalBonded = useMemo(() => 
    positions.reduce((sum, p) => sum + p.bondAmount, 0), 
  [positions]);

  const projectionData = useMemo(() => {
    if (totalBonded === 0) return [];

    const data = [];
    const months = 12;
    const monthlyRate = weightedApy / 12;

    let passiveBalance = totalBonded;
    let activeBalance = totalBonded;

    for (let i = 0; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        passive: passiveBalance,
        active: activeBalance,
      });

      passiveBalance += totalBonded * monthlyRate;
      activeBalance *= (1 + monthlyRate);
    }

    return data;
  }, [totalBonded, weightedApy]);

  const opportunityCost = projectionData.length > 0 
    ? projectionData[projectionData.length - 1].active - projectionData[projectionData.length - 1].passive 
    : 0;

  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Compound Growth Forecast</h3>
          <p className="text-sm text-zinc-500">Projected 1Y growth trajectory</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase">
          <TrendingUp className="w-3 h-3" />
          <span>Active Strategy</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Coins className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase">Opportunity Cost</span>
          </div>
          <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
            +{opportunityCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Extra RUNE via compounding
          </div>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase">Forecasted Balance</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {projectionData.length > 0 
              ? projectionData[projectionData.length - 1].active.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
              : '0.00'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Expected yield including compounding
          </div>
        </div>
      </div>

      {projectionData.length > 0 ? (
        <div className="h-56 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.05} vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: '#71717a' }} 
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#71717a' }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}
                width={40}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: any) => [`${(Number(value) || 0).toLocaleString()} RUNE`, 'Balance']}
              />
              <Area 
                type="monotone" 
                dataKey="passive" 
                stroke="#71717a" 
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="transparent" 
                name="Passive"
              />
              <Area 
                type="monotone" 
                dataKey="active" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#activeGradient)" 
                name="Active (Compounded)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center">
          <p className="text-sm text-zinc-500">No positions available for projection</p>
        </div>
      )}
    </div>
  );
}
