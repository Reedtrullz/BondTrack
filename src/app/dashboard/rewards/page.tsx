'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { useEarningsHistory } from '@/lib/hooks/use-earnings';
import { calculatePerChurnReward, calculateOperatorFeePaid } from '@/lib/utils/calculations';
import { runeToNumber } from '@/lib/utils/formatters';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { FeeImpactTracker } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';
import { APYChart } from '@/components/dashboard/apy-chart';
import { PriceChart } from '@/components/dashboard/price-chart';
import { RewardVelocity } from '@/components/dashboard/reward-velocity';

export default function RewardsPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading: isLoadingPositions } = useBondPositions(address);
  const { price } = useRunePrice();
  const { earnings, isLoading: isLoadingEarnings } = useEarningsHistory('day', 30);

  const isLoading = isLoadingPositions || isLoadingEarnings;

  if (isLoading) {
    return <div className="animate-pulse h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />;
  }

  const currentAward = earnings?.meta?.blockRewards || '0';
  const positionsWithRewards = positions.map((pos) => {
    const perChurnReward = calculatePerChurnReward(
      pos.bondSharePercent,
      currentAward,
      pos.operatorFee
    );
    const operatorFeePaid = calculateOperatorFeePaid(perChurnReward, pos.operatorFee);
    return {
      ...pos,
      perChurnReward,
      operatorFeePaid,
      usdValue: perChurnReward * price,
    };
  });

  const totalPerChurnReward = positionsWithRewards.reduce((sum, pos) => sum + pos.perChurnReward, 0);
  const totalOperatorFee = positionsWithRewards.reduce((sum, pos) => sum + pos.operatorFeePaid, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Rewards & PnL</h2>
      </div>

      <RewardVelocity 
        totalPerChurnReward={totalPerChurnReward} 
        totalOperatorFee={totalOperatorFee} 
        price={price} 
      />

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <APYChart />
          <PriceChart />
        </div>

        <PnLDashboard
          positions={positions}
          currentRunePrice={price}
          earningsHistory={earnings}
        />

        <FeeImpactTracker
          earningsHistory={earnings}
          positions={positions}
        />

        <AutoCompoundChart
          earningsHistory={earnings}
          initialBond={positions.reduce((sum, pos) => sum + pos.bondAmount, 0)}
        />
      </div>

      {positionsWithRewards.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Per-Churn Reward Breakdown</h3>
          </div>

          <div className="block md:hidden p-4 space-y-3">
            {positionsWithRewards.map((pos) => (
              <div key={pos.nodeAddress} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {pos.nodeAddress.slice(0, 8)}...
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-zinc-500">Bond</div>
                    <div className="font-mono text-zinc-900 dark:text-zinc-100">{pos.bondAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Share</div>
                    <div className="font-mono text-zinc-900 dark:text-zinc-100">{pos.bondSharePercent.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Fee</div>
                    <div className="font-mono text-zinc-900 dark:text-zinc-100">{pos.operatorFeeFormatted}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Reward</div>
                    <div className="font-mono text-zinc-900 dark:text-zinc-100">
                      {((runeToNumber(currentAward) * pos.bondSharePercent) / 100).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Fee Paid</div>
                    <div className="font-mono text-red-600 dark:text-red-400">-{pos.operatorFeePaid.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Net</div>
                    <div className="font-mono text-green-600 dark:text-green-400">{pos.perChurnReward.toFixed(4)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-zinc-500">USD Value</div>
                    <div className="font-mono text-zinc-900 dark:text-zinc-100">${pos.usdValue.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-zinc-500 font-medium">Node</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">Bond Amount</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">Bond Share</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">Operator Fee</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">Reward (RUNE)</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">Fee Paid (RUNE)</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">Net (RUNE)</th>
                  <th className="px-4 py-2 text-right text-zinc-500 font-medium">USD Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {positionsWithRewards.map((pos) => (
                  <tr key={pos.nodeAddress} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs">
                      {pos.nodeAddress.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {pos.bondAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {pos.bondSharePercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {pos.operatorFeeFormatted}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {(
                        (runeToNumber(currentAward) * pos.bondSharePercent) /
                        100
                      ).toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 dark:text-red-400 font-mono">
                      -{pos.operatorFeePaid.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-mono">
                      {pos.perChurnReward.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      ${pos.usdValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {positionsWithRewards.length === 0 && (
        <div className="text-sm text-zinc-500 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
          No bond positions found. Connect your wallet to see rewards breakdown.
        </div>
      )}
    </div>
  );
}
