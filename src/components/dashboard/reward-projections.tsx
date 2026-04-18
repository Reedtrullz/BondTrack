import { formatRuneAmount } from '@/lib/utils/formatters';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

interface ProjectionTimeframe {
  label: string;
  icon: React.ReactNode;
  days: number;
}

const TIMEFRAMES: ProjectionTimeframe[] = [
  { label: 'Daily', icon: <Clock className="w-4 h-4" />, days: 1 },
  { label: 'Weekly', icon: <Calendar className="w-4 h-4" />, days: 7 },
  { label: 'Monthly', icon: <Calendar className="w-4 h-4" />, days: 30 },
];

interface RewardProjection {
  timeframe: string;
  grossRuneReward: number;
  netRuneReward: number;
  feeLeakage: number;
  usdValue: number;
  bondAfter: number;
  growthPercent: number;
}

interface RewardProjectionsProps {
  totalBonded: number;
  weightedAPY: number;
  runePrice: number;
  averageFeeBps?: number;
}

function calculateProjections(
  totalBonded: number,
  weightedAPY: number,
  runePrice: number,
  averageFeeBps: number = 0
): RewardProjection[] {
  if (totalBonded <= 0 || weightedAPY <= 0) {
    return TIMEFRAMES.map((tf) => ({
      timeframe: tf.label,
      grossRuneReward: 0,
      netRuneReward: 0,
      feeLeakage: 0,
      usdValue: 0,
      bondAfter: totalBonded,
      growthPercent: 0,
    }));
  }

  const dailyRate = Math.pow(1 + weightedAPY / 100, 1 / 365) - 1;
  const feeMultiplier = averageFeeBps / 10000;

  return TIMEFRAMES.map((tf) => {
    const compoundFactor = Math.pow(1 + dailyRate, tf.days);
    const bondAfter = totalBonded * compoundFactor;
    
    const grossRuneReward = bondAfter - totalBonded;
    const feeLeakage = grossRuneReward * feeMultiplier;
    const netRuneReward = grossRuneReward - feeLeakage;
    
    const usdValue = netRuneReward * runePrice;
    const growthPercent = totalBonded > 0 ? (netRuneReward / totalBonded) * 100 : 0;

    return {
      timeframe: tf.label,
      grossRuneReward,
      netRuneReward,
      feeLeakage,
      usdValue,
      bondAfter,
      growthPercent,
    };
  });
}

function formatProjectionAmount(amount: number, _timeframe: string): string {
  if (amount === 0) return '0.00';
  return parseFloat(amount.toFixed(2)).toString();
}

export function RewardProjections({
  totalBonded,
  weightedAPY,
  runePrice,
  averageFeeBps = 0,
}: RewardProjectionsProps) {
  const projections = calculateProjections(totalBonded, weightedAPY, runePrice, averageFeeBps);
  const hasData = totalBonded > 0 && weightedAPY > 0;

  return (
    <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Reward Projections
        </h3>
      </div>

      {!hasData ? (
        <div className="h-32 flex items-center justify-center text-zinc-400 text-sm">
          {totalBonded <= 0
            ? 'No bonded RUNE to project rewards'
            : 'APY data not yet available'}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {projections.map((proj, idx) => {
              const tf = TIMEFRAMES[idx];

              return (
                <div
                  key={proj.timeframe}
                  className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
                >
                  <div className="flex items-center gap-2 text-zinc-500 mb-3">
                    {tf.icon}
                    <span className="text-xs font-semibold uppercase tracking-wider">{proj.timeframe}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-zinc-500">Net Reward</div>
                      <div className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                        +ᚱ {formatProjectionAmount(proj.netRuneReward, proj.timeframe)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-zinc-400">Fee Leakage</div>
                      <div className="text-xs font-mono text-zinc-500">
                        -ᚱ {formatProjectionAmount(proj.feeLeakage, proj.timeframe)}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 mt-2">
                      <div className="text-xs text-zinc-500">USD Value</div>
                      <div className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                        ${proj.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <div className="text-xs text-zinc-500">Growth</div>
                       <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                         +{proj.growthPercent.toFixed(3)}%
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-zinc-400 pt-2">
            Projections assume constant APY of {weightedAPY.toFixed(2)}% with
            auto-compounding. Calculated as Net rewards after operator fees.
          </div>
        </div>
      )}
    </div>
  );
}
