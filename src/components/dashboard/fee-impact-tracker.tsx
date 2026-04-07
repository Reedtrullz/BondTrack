'use client';

import { calculateOperatorFeePaid } from '@/lib/utils/calculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Receipt, DollarSign, Clock } from 'lucide-react';

interface FeeImpactTrackerProps {
  earningsHistory?: {
    intervals: {
      startTime: string;
      endTime: string;
      earnings: string;
      bondingEarnings: string;
    }[];
  };
  positions?: {
    operatorFee: number;
    bondAmount: number;
  }[];
}

export function FeeImpactTracker({ earningsHistory, positions = [] }: FeeImpactTrackerProps) {
  const avgOperatorFeeBps = positions.length > 0
    ? positions.reduce((sum, pos) => sum + pos.operatorFee, 0) / positions.length
    : 1000;

  const chartData = earningsHistory?.intervals.slice().reverse().map((interval, index) => {
    const earnings = Number(interval.earnings || interval.bondingEarnings) / 1e8;
    const feePaid = calculateOperatorFeePaid(earnings, avgOperatorFeeBps);
    const date = new Date(Number(interval.endTime) / 1e9);
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fee: feePaid,
      cumulative: 0,
    };
  }) || [];

  let cumulativeFees = 0;
  chartData.forEach((d) => {
    cumulativeFees += d.fee;
    d.cumulative = cumulativeFees;
  });

  const totalFeesPaid = cumulativeFees;
  const avgFeePerPeriod = chartData.length > 0 ? totalFeesPaid / chartData.length : 0;
  const feePercentage = (avgOperatorFeeBps / 10000) * 100;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-500">Operator Fee Impact</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Receipt className="w-4 h-4" />
            <span className="text-xs">Total Fees Paid</span>
          </div>
          <div className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100">
            ${totalFeesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Avg Per Period</span>
          </div>
          <div className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100">
            ${avgFeePerPeriod.toFixed(2)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Operator Fee Rate</span>
          </div>
          <div className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100">
            {feePercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="h-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#71717a' }} 
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={{ stroke: '#3f3f46' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#71717a' }} 
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={{ stroke: '#3f3f46' }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#27272a', 
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cumulative Fees']}
              />
              <Bar dataKey="cumulative" fill="#52525b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
