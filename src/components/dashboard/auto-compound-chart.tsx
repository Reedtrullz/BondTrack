import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Coins, DollarSign, Globe, BarChart3, Info } from 'lucide-react';
import { BondPosition } from '@/lib/types/node';
import { useHistoricalApy } from '@/lib/hooks/use-historical-apy';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { formatRuneAmount, formatAmount, formatUsd, formatRuneFromNumber } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

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
    
    // Calculate personal leakage factor (ratio of weighted vs network APY)
    // We apply this same leakage to the historical network average
    const leakageFactor = weightedApy > 0 ? weightedApy / (weightedApy + 1) : 1; // Simplified
    
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

    let activeBalance = totalBonded;

    for (let i = 0; i <= months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      const passiveRune = totalBonded;
      const activeRune = activeBalance;

      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
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

  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Compound Growth Forecast</h3>
          <p className="text-sm text-zinc-500">Projected 1Y trajectory ({useHistoricalBaseline ? 'Historical Blended' : 'Current APY'})</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Historical Toggle */}
          <button
            onClick={() => setUseHistoricalBaseline(!useHistoricalBaseline)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              useHistoricalBaseline 
                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500"
            )}
            title="Uses a 30-day trailing average APY for more realistic forecasting"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Realistic Mode</span>
          </button>

          {/* Currency Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setViewMode('rune')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                viewMode === 'rune' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}
            >
              ᚱ RUNE
            </button>
            <button
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
          <span className="text-[10px] font-bold text-zinc-400 uppercase whitespace-nowrap mr-2">Moon Scenarios:</span>
          {[currentRunePrice, 10, 20, 50, 100].map((price) => (
            <button
              key={price}
              onClick={() => setTargetPrice(price === currentRunePrice ? null : price as number)}
              className={cn(
                "px-3 py-1 rounded-lg border text-xs font-mono transition-all whitespace-nowrap",
                (targetPrice === price || (price === currentRunePrice && targetPrice === null))
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
              )}
            >
              ${price?.toFixed(price < 10 ? 2 : 0)}
              {price === currentRunePrice && " (Live)"}
            </button>
          ))}
        </div>
      )}
      
      <div className="h-72 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 p-4 mb-8 border border-zinc-100 dark:border-zinc-800/50">
        <ResponsiveContainer width="100%" height="100%">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Compound Gains (1Y)</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            +{viewMode === 'usd' ? formatUsd(compoundGainsValue) : formatRuneFromNumber(compoundGainsValue)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Additional {viewMode === 'usd' ? 'value' : 'RUNE'} from compounding
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Forecasted Balance</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {finalEntry ? (viewMode === 'usd' ? formatUsd(finalEntry.active) : formatRuneFromNumber(finalEntry.active)) : '0.00'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Estimated total after 12 months
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Yield Efficiency</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {forecastApy.toFixed(2)}%
          </div>
          <div className="text-[10px] text-emerald-600/60 mt-1 flex items-center gap-1">
            Using {useHistoricalBaseline ? '180d average' : 'live APY'} 
            <Info className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

const Zap = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);
