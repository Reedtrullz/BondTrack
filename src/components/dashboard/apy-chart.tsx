'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApyChartData } from '@/lib/hooks/use-apy-chart-data';
import { SkeletonChart } from '@/components/shared/skeleton';
import { formatPercent } from '@/lib/utils/formatters';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function formatAPY(value: number): string {
  return formatPercent(value, value > 0 && value < 1 ? 4 : 2);
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 dark:bg-zinc-800 border border-zinc-700 dark:border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-white">
          {formatAPY(payload[0].value)} APY
        </p>
      </div>
    );
  }
  return null;
}

interface APYChartProps {
  count?: number;
}

export function APYChart({ count = 365 }: APYChartProps) {
  const { data, isLoading, error } = useApyChartData(count);

  return (
    <div className="p-6 rounded-2xl bg-transparent border border-transparent shadow-none">
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Earnings History</h3>
      </div>

      {isLoading ? (
        <SkeletonChart height={160} />
      ) : error ? (
        <div className="h-[160px] sm:h-[200px] flex items-center justify-center text-red-500 text-sm">
          Failed to load APY data
        </div>
      ) : data.length === 0 ? (
        <div className="h-[160px] sm:h-[200px] flex flex-col items-center justify-center text-center p-4">
          <div className="text-zinc-400 text-sm mb-1">No historical data available</div>
          <div className="text-[10px] text-zinc-500 max-w-[200px]">
            Current network APY is provided above, but historical trends are unavailable.
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.03} vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              dx={-5}
              width={40}
              domain={[0, 'dataMax + 1']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="apy"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#apyGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#0ea5e9' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div className="mt-2 text-[10px] text-zinc-500 italic">
        APR is backward-calculated from historical earnings and does not guarantee future returns.
      </div>
    </div>
  );
}
