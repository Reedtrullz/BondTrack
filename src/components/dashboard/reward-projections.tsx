'use client';

import { NETWORK } from '@/lib/config';
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
  runeReward: number;
  usdValue: number;
  bondAfter: number;
  growthPercent: number;
}

interface RewardProjectionsProps {
  totalBonded: number;
  weightedAPY: number;
  runePrice: number;
}

function calculateProjections(
  totalBonded: number,
  weightedAPY: number,
  runePrice: number
): RewardProjection[] {
  if (totalBonded <= 0 || weightedAPY <= 0) {
    return TIMEFRAMES.map((tf) => ({
      timeframe: tf.label,
      runeReward: 0,
      usdValue: 0,
      bondAfter: totalBonded,
      growthPercent: 0,
    }));
  }

  const dailyRate = weightedAPY / 365 / 100;

  return TIMEFRAMES.map((tf) => {
    const compoundFactor = Math.pow(1 + dailyRate, tf.days);
    const bondAfter = totalBonded * compoundFactor;
    const runeReward = bondAfter - totalBonded;
    const usdValue = runeReward * runePrice;
    const growthPercent = totalBonded > 0 ? (runeReward / totalBonded) * 100 : 0;

    return {
      timeframe: tf.label,
      runeReward,
      usdValue,
      bondAfter,
      growthPercent,
    };
  });
}

export function RewardProjections({
  totalBonded,
  weightedAPY,
  runePrice,
}: RewardProjectionsProps) {
  const projections = calculateProjections(totalBonded, weightedAPY, runePrice);
  const hasData = totalBonded > 0 && weightedAPY > 0;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-4">
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
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {projections.map((proj, idx) => {
              const tf = TIMEFRAMES[idx];
              return (
                <div
                  key={proj.timeframe}
                  className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
                >
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-2">
                    {tf.icon}
                    <span className="text-xs font-medium">{proj.timeframe}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <div className="text-xs text-zinc-500">RUNE Reward</div>
                      <div className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                        +{proj.runeReward.toFixed(4)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-zinc-500">USD Value</div>
                      <div className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                        ${proj.usdValue.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-zinc-500">Bond After</div>
                      <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                        {formatRuneAmount(
                          String(BigInt(Math.round(Math.max(0, proj.bondAfter) * 1e8))),
                          2
                        )}{' '}
                        RUNE
                      </div>
                    </div>

                    <div>
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

          <div className="text-xs text-zinc-400 pt-1">
            Projections assume constant APY of {weightedAPY.toFixed(2)}% with
            auto-compounding. Actual rewards vary per churn.
          </div>
        </div>
      )}
    </div>
  );
}
