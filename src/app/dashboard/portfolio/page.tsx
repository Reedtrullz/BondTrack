'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useLpPositions } from '@/hooks/use-lp-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { formatUsd } from '@/lib/utils/formatters';
import {
  TrendingUp,
  Calendar,
  BarChart3,
  ArrowRight,
  Wallet,
  Shield,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#10b981', '#f59e0b'];

interface PerformanceCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: 'emerald' | 'amber' | 'cyan';
}

function PerformanceCard({ label, value, icon, highlight }: PerformanceCardProps) {
  const highlightStyles = {
    emerald: 'border-emerald-200/60 dark:border-emerald-800/40',
    amber: 'border-amber-200/60 dark:border-amber-800/40',
    cyan: 'border-cyan-200/60 dark:border-cyan-800/40',
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl border bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300',
        highlight ? highlightStyles[highlight] : 'border-zinc-200/60 dark:border-zinc-800/60'
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
        {value}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const {
    positions: bondPositions,
    isLoading: bondLoading,
  } = useBondPositions(address);
  const {
    positions: lpPositions,
    isLoading: lpLoading,
  } = useLpPositions(address);
  const { price: runePrice, isLoading: priceLoading } = useRunePrice();
  const { isLoading: metricsLoading } = useNetworkMetrics();

  const isLoading = bondLoading || lpLoading || priceLoading || metricsLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
      </div>
    );
  }

  const totalBondedRune = bondPositions.reduce((sum, p) => sum + p.bondAmount, 0);
  const totalBondedValueUsd = totalBondedRune * runePrice;

  const totalLpValueUsd = lpPositions.reduce(
    (sum, p) => sum + p.currentTotalValueUsd,
    0
  );

  const totalAum = totalBondedValueUsd + totalLpValueUsd;

  const pieData = [
    { name: 'Bond', value: totalBondedValueUsd, fill: COLORS[0] },
    { name: 'LP', value: totalLpValueUsd, fill: COLORS[1] },
  ];

  const addrParam = address ? `?address=${address}` : '';

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Portfolio
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Unified view of your Bond and LP positions
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/50">
          <Wallet className="w-3 h-3" />
          <span>Live</span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Total Portfolio Value</span>
        </div>
        <div className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
          {formatUsd(totalAum, 2)}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Bond:{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {formatUsd(totalBondedValueUsd, 2)}
            </span>
          </span>
          <span>
            LP:{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {formatUsd(totalLpValueUsd, 2)}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Asset Allocation
          </h2>
          {totalAum > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number' ? formatUsd(value, 2) : String(value)
                  }
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgb(228 228 231)',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              No portfolio data available
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Performance Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PerformanceCard
              label="7d Return"
              value="0.00%"
              icon={<Calendar className="w-4 h-4 text-cyan-500" />}
              highlight="cyan"
            />
            <PerformanceCard
              label="30d Return"
              value="0.00%"
              icon={<BarChart3 className="w-4 h-4 text-purple-500" />}
            />
            <PerformanceCard
              label="YTD Return"
              value="0.00%"
              icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
              highlight="emerald"
            />
          </div>
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            Historical performance data will be available in a future update.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/risk${addrParam}`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <Shield className="w-4 h-4" />
            View Risk
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/dashboard/rewards${addrParam}`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <TrendingUp className="w-4 h-4" />
            View Rewards
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/dashboard/lp${addrParam}`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <Coins className="w-4 h-4" />
            View LP
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
