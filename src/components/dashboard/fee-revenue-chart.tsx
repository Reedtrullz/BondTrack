'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatRuneAmount, runeToNumber } from '@/lib/utils/formatters';
import type { FeeRevenueDailyRaw } from '@/lib/api/midgard';

interface FeeRevenueChartProps {
  daily?: FeeRevenueDailyRaw[];
  isLoading?: boolean;
  error?: string | null;
}

interface ChartPoint {
  date: string;
  totalFees: number;
  bondRewards: number;
  poolRewards: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: ChartPoint }>;
  label?: string;
}

function toChartPoint(item: FeeRevenueDailyRaw): ChartPoint {
  return {
    date: item.date,
    totalFees: runeToNumber(item.totalFees),
    bondRewards: runeToNumber(item.bondRewards),
    poolRewards: runeToNumber(item.poolRewards),
  };
}

function FeeRevenueTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload as ChartPoint;
  const total = point.totalFees;
  const bondRewards = point.bondRewards;
  const poolRewards = point.poolRewards;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="mb-2 text-xs text-zinc-400">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-zinc-400">Total fees</span>
          <span className="font-semibold text-white">{formatRuneAmount(String(Math.round(total * 1e8)))}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-zinc-400">Bond rewards</span>
          <span className="font-semibold text-emerald-400">{formatRuneAmount(String(Math.round(bondRewards * 1e8)))}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-zinc-400">Pool rewards</span>
          <span className="font-semibold text-sky-400">{formatRuneAmount(String(Math.round(poolRewards * 1e8)))}</span>
        </div>
      </div>
    </div>
  );
}

export function FeeRevenueChart({ daily, isLoading, error }: FeeRevenueChartProps) {
  const data = (daily ?? []).map(toChartPoint);

  return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 min-h-[300px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Protocol Fee Revenue</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">30-day fee trend from Midgard earnings history</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[300px] rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
      ) : error ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-red-500 dark:border-zinc-800">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          No revenue history available
        </div>
      ) : (
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="feeRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.06} vertical={false} />
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
              tickFormatter={(value) => formatRuneAmount(String(Math.round(Number(value) * 1e8)))}
              dx={-5}
              width={70}
              interval="preserveStartEnd"
            />
            <Tooltip content={<FeeRevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="totalFees"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#feeRevenueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
