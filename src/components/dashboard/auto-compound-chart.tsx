'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface AutoCompoundChartProps {
  earningsHistory?: {
    intervals: {
      startTime: string;
      endTime: string;
      bondingEarnings: string;
    }[];
  };
  initialBond?: number;
}

export function AutoCompoundChart({ earningsHistory, initialBond = 0 }: AutoCompoundChartProps) {
  const chartData = earningsHistory?.intervals.slice().reverse().map((interval) => {
    const bondingEarnings = Number(interval.bondingEarnings) / 1e8;
    const date = new Date(Number(interval.endTime));
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      earnings: bondingEarnings,
    };
  }) || [];

  let cumulativeBond = initialBond;
  const dataWithCumulative = chartData.map((d) => {
    cumulativeBond += d.earnings;
    return {
      ...d,
      cumulative: cumulativeBond,
    };
  });

  const totalGrowth = cumulativeBond - initialBond;
  const growthPercent = initialBond > 0 ? (totalGrowth / initialBond) * 100 : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-500">Auto-Compound Growth</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Total Growth</span>
          </div>
          <div className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400">
            {totalGrowth.toFixed(4)} RUNE
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            +{growthPercent.toFixed(2)}% from compounding
          </div>
        </div>
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Current Bond Value</span>
          </div>
          <div className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100">
            {cumulativeBond.toFixed(4)} RUNE
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {chartData.length} periods
          </div>
        </div>
      </div>

      {dataWithCumulative.length > 0 ? (
        <div className="h-48 sm:h-64 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataWithCumulative} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="bondGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#71717a' }} 
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={{ stroke: '#3f3f46' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#71717a' }} 
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={{ stroke: '#3f3f46' }}
                tickFormatter={(v) => v.toFixed(1)}
                width={40}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#27272a', 
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`${Number(value).toFixed(4)} RUNE`, 'Cumulative Bond']}
              />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#bondGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-36 sm:h-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center">
          <p className="text-sm text-zinc-500">No earnings data available</p>
        </div>
      )}
    </div>
  );
}
