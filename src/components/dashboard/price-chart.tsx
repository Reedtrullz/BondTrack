'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getRunePriceHistory, type RunePriceHistoryRaw } from '@/lib/api/midgard';

type IntervalOption = 'day' | 'week' | 'month' | 'year';

interface PriceDataPoint {
  date: string;
  price: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

function parsePriceData(raw: RunePriceHistoryRaw): PriceDataPoint[] {
  return raw.intervals.map((interval) => {
    const date = new Date(Number(interval.startTime) * 1000);
    return {
      date: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      price: Number(interval.runePriceUSD),
    };
  });
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-zinc-100">
          {formatPrice(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

interface PriceChartProps {
  initialInterval?: IntervalOption;
}

export function PriceChart({ initialInterval = 'week' }: PriceChartProps) {
  const [interval, setIntervalState] = useState<IntervalOption>(initialInterval);
  const [data, setData] = useState<PriceDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const apiInterval = interval === 'day' ? 'hour' : (interval === 'week' ? 'day' : (interval === 'month' ? 'day' : 'day'));
        const count = interval === 'day' ? 24 : interval === 'week' ? 7 : interval === 'month' ? 30 : 365;
        const raw = await getRunePriceHistory(apiInterval, count);
        setData(parsePriceData(raw));
      } catch (err) {
        setError('Failed to load price data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [interval]);

  const setIntervalValue = (value: IntervalOption) => {
    setIntervalState(value);
  };

  const intervals: { value: IntervalOption; label: string }[] = [
    { value: 'day', label: '24H' },
    { value: 'week', label: '7D' },
    { value: 'month', label: '30D' },
    { value: 'year', label: '1Y' },
  ];

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          RUNE Price
        </h3>
        <div className="flex gap-1">
          {intervals.map((item) => (
            <button
              key={item.value}
              onClick={() => setIntervalValue(item.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                interval === item.value
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
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
        <div className="h-[160px] sm:h-[200px] flex items-center justify-center text-zinc-400 text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
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
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              dx={-5}
              width={40}
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
