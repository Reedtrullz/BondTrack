import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Coins, BarChart3, Info, Zap } from 'lucide-react';
import { BondPosition } from '@/lib/types/node';
import { useHistoricalApy } from '@/lib/hooks/use-historical-apy';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { formatUsd, formatRuneFromNumber } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { ChartDataTable } from '@/components/shared/chart-data-table';

interface CompoundGrowthForecastProps {
  positions: BondPosition[];
  weightedApy: number; // Current instantaneous APY after fees
}

export function AutoCompoundChart({ positions, weightedApy }: CompoundGrowthForecastProps) {
  const [viewMode, setViewMode] = useState<'rune' | 'usd'>('rune');
  const [useHistoricalBaseline, setUseHistoricalBaseline] = useState(true);
  
  const { price: currentRunePrice } = useRunePrice();
  const [targetPrice, setTargetPrice] = useState<number | null>(null);
  const { historicalApy } = useHistoricalApy(180);

  const effectivePrice = targetPrice ?? currentRunePrice ?? 0;

  const totalBonded = useMemo(() => 
    positions?.reduce((sum, p) => sum + p.bondAmount, 0) ?? 0, 
  [positions]);

  // Calculate the forecast APY based on user preference
  const forecastApy = useMemo(() => {
    if (!useHistoricalBaseline || !historicalApy) return weightedApy;
    
    // Blend: 70% historical (stable) + 30% current (momentum)
    const blendedNetworkApy = (historicalApy * 0.7) + (weightedApy * 0.3);
    return blendedNetworkApy;
  }, [useHistoricalBaseline, historicalApy, weightedApy]);

  const projectionData = useMemo(() => {
    if (!positions?.length || totalBonded === 0 || forecastApy <= 0) {
      return [];
    }

    const data = [];
    const months = 12;
    const monthlyRate = Math.pow(1 + forecastApy / 100, 1 / 12) - 1;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const startMonth = startDate.getMonth();

    let activeBalance = totalBonded;

    const startYear = startDate.getFullYear();
    for (let i = 0; i <= months; i++) {
      const date = new Date(startDate.getFullYear(), startMonth + i, 1);
      
      const passiveRune = totalBonded;
      const activeRune = activeBalance;
      const monthLabel = date.getFullYear() !== startYear 
        ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short' });

      data.push({
        month: monthLabel,
        passive: viewMode === 'rune' ? passiveRune : passiveRune * effectivePrice,
        active: viewMode === 'rune' ? activeRune : activeRune * effectivePrice,
        passiveRune,
        activeRune,
      });

      activeBalance *= (1 + monthlyRate);
    }

    return data;
  }, [positions, totalBonded, forecastApy, viewMode, effectivePrice]);

  const finalEntry = projectionData[projectionData.length - 1];
  const compoundGainsRune = finalEntry ? finalEntry.activeRune - finalEntry.passiveRune : 0;
  const compoundGainsValue = viewMode === 'rune' ? compoundGainsRune : compoundGainsRune * effectivePrice;
  const priceScenarios = [currentRunePrice, 10, 20, 50, 100].filter(
    (price): price is number => typeof price === 'number' && Number.isFinite(price)
  );

  return (
    <div
      className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
      role="region"
      aria-label="Compound growth scenario"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase mb-1">Compound Growth Forecast</h3>
          <p className="text-sm text-zinc-500">
            Scenario estimate only, not realized rewards ({useHistoricalBaseline ? 'historical blend' : 'current APY basis'})
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Historical Toggle */}
          <button
            type="button"
            aria-pressed={useHistoricalBaseline}
            onClick={() => setUseHistoricalBaseline(!useHistoricalBaseline)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              useHistoricalBaseline 
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500"
            )}
            title="Uses a 180-day historical APY blend for steadier scenario estimates"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Historical blend</span>
          </button>

          {/* Currency Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              aria-pressed={viewMode === 'rune'}
              onClick={() => setViewMode('rune')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                viewMode === 'rune' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}
            >
              ᚱ RUNE
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'usd'}
              onClick={() => setViewMode('usd')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                viewMode === 'usd' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      {/* Price Target Selector (only in USD mode) */}
      {viewMode === 'usd' && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-[10px] font-bold text-zinc-400 uppercase whitespace-nowrap mr-2">Price scenarios:</span>
          {priceScenarios.map((price) => {
            const isCurrentQuote = price === currentRunePrice;
            const isSelected = targetPrice === price || (isCurrentQuote && targetPrice === null);

            return (
              <button
                type="button"
                key={price}
                aria-pressed={isSelected}
                onClick={() => setTargetPrice(isCurrentQuote ? null : price)}
                className={cn(
                  "px-3 py-1 rounded-lg border text-xs font-mono transition-all whitespace-nowrap",
                  isSelected
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                )}
              >
                ${price.toFixed(price < 10 ? 2 : 0)}
                {isCurrentQuote ? ' (current quote)' : null}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="h-72 min-w-0 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 p-4 mb-8 border border-zinc-100 dark:border-zinc-800/50">
        <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={1}>
          <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10, fill: '#71717a' }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#71717a' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                if (viewMode === 'usd') return v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`;
                return v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0);
              }}
              width={viewMode === 'usd' ? 55 : 45}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3">{label} Forecast</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] text-zinc-500 uppercase">Compounded Balance</p>
                          <p className="text-sm font-bold text-emerald-400 font-mono">
                            {viewMode === 'usd' ? formatUsd(payload[1].value as number) : formatRuneFromNumber(payload[1].value as number)}
                          </p>
                          {viewMode === 'usd' && (
                            <p className="text-[10px] text-zinc-400 font-mono">
                              {formatRuneFromNumber(payload[1].payload.activeRune)}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-zinc-800">
                          <p className="text-[9px] text-zinc-500 uppercase">Passive HODL</p>
                          <p className="text-xs font-bold text-zinc-400 font-mono">
                            {viewMode === 'usd' ? formatUsd(payload[0].value as number) : formatRuneFromNumber(payload[0].value as number)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="passive" 
              stroke="#71717a" 
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="transparent" 
              name="Passive"
              animationDuration={1500}
            />
            <Area 
              type="monotone" 
              dataKey="active" 
              stroke="#10b981" 
              strokeWidth={2}
              fill="url(#activeGradient)" 
              name="Active"
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption={`12-month compound growth scenario in ${viewMode.toUpperCase()}`}
        columns={['Month', 'No-compound baseline', 'Scenario balance']}
        rows={projectionData.map((point) => [
          point.month,
          viewMode === 'usd' ? formatUsd(point.passive) : formatRuneFromNumber(point.passive),
          viewMode === 'usd' ? formatUsd(point.active) : formatRuneFromNumber(point.active),
        ])}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">Estimated compound gain (1Y)</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            +{viewMode === 'usd' ? formatUsd(compoundGainsValue) : formatRuneFromNumber(compoundGainsValue)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Scenario gain from compounding; not realized rewards
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">Estimated 12M balance</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {finalEntry ? (viewMode === 'usd' ? formatUsd(finalEntry.active) : formatRuneFromNumber(finalEntry.active)) : '0.00'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Scenario balance after 12 months; not wallet-confirmed
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">APY scenario</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {forecastApy.toFixed(2)}%
          </div>
          <div className="text-[10px] text-emerald-600/60 mt-1 flex items-center gap-1">
            Using {useHistoricalBaseline ? '180d historical blend' : 'current APY estimate'}
            <Info className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
