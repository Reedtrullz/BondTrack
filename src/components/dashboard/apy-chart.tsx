'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getEarningsHistory, getNetwork, type EarningsHistoryRaw, type NetworkRaw } from '@/lib/api/midgard';
import { runeToNumber } from '@/lib/utils/formatters';
import { TrendingUp } from 'lucide-react';

interface APYDataPoint {
  date: string;
  apy: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function formatAPY(value: number): string {
  if (value > 0 && value < 1) {
    return `${value.toFixed(4)}%`;
  }
  return `${value.toFixed(2)}%`;
}

async function calculateAPYHistory(earningsRaw: EarningsHistoryRaw, networkRaw: NetworkRaw): Promise<APYDataPoint[]> {
  const intervals = earningsRaw.intervals || [];
  const totalBondsRune = Number(networkRaw.bondMetrics?.totalActiveBond || '0');

  if (intervals.length === 0 || totalBondsRune === 0) {
    return [];
  }

  const baselineApy = parseFloat(networkRaw.bondingAPY || '0');
  
  const totalPeriodEarnings = intervals.reduce((sum, curr) => sum + Number(curr.bondingEarnings), 0);
  const avgDailyEarnings = (totalPeriodEarnings / intervals.length) / 1e8;

  return intervals.map((interval) => {
    const dailyEarnings = Number(interval.bondingEarnings) / 1e8;
    const ratio = avgDailyEarnings !== 0 ? dailyEarnings / avgDailyEarnings : 1;
    
    const pointApy = baselineApy * ratio;
    
    const date = new Date(Number(interval.startTime) * 1000);
    return {
      date: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      apy: Math.max(0, pointApy),
    };
  }).reverse();
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-zinc-100">
          APY: {formatAPY(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

interface APYChartProps {
  interval?: string;
  count?: number;
}

export function APYChart({ interval = 'year', count = 365 }: APYChartProps) {
  const [data, setData] = useState<APYDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentApy, setCurrentApy] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const apiInterval = 'day';
        const apiCount = count || 365;
        const [earningsRaw, networkRaw] = await Promise.all([
          getEarningsHistory(apiInterval, apiCount),
          getNetwork(),
        ]);

        const networkApy = parseFloat(networkRaw.bondingAPY || '0');
        setCurrentApy(networkApy);

        const apyData = await calculateAPYHistory(earningsRaw, networkRaw);
        setData(apyData);
      } catch (err) {
        setError('Failed to load APY data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [interval, count]);

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Estimated Network APY
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Annualized 1Y Trend</p>
        </div>
        
        {currentApy !== null && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {formatAPY(currentApy)}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[160px] sm:h-[200px] flex items-center justify-center text-zinc-400 text-sm">
          Loading...
        </div>
      ) : error ? (
        <div className="h-[160px] sm:h-[200px] flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="h-[160px] sm:h-[200px] flex flex-col items-center justify-center text-center p-4">
          <div className="text-zinc-400 text-sm mb-1">No historical data available</div>
          <div className="text-[10px] text-zinc-500 max-w-[200px]">
            Current network APY is provided above, but historical trends are unavailable.
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
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
    </div>
  );
}
