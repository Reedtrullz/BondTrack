'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice } from '@/lib/hooks/use-rune-price';
import { useEarningsHistory } from '@/lib/hooks/use-earnings';
import { calculatePerChurnReward, calculateOperatorFeePaid } from '@/lib/utils/calculations';
import { formatRuneAmount, runeToNumber } from '@/lib/utils/formatters';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { FeeImpactTracker } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';

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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Rewards & PnL</h2>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Per-Churn Reward (est.)</div>
          <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
            {totalPerChurnReward.toFixed(4)} RUNE
          </div>
        </div>
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Operator Fees (per churn)</div>
          <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
            {totalOperatorFee.toFixed(4)} RUNE
          </div>
        </div>
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">RUNE Price</div>
          <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
            ${price.toFixed(4)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">USD Value Per Churn</div>
          <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
            ${(totalPerChurnReward * price).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Earnings History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-zinc-500 font-medium">Date</th>
                <th className="px-4 py-2 text-right text-zinc-500 font-medium">Bonding Earnings</th>
                <th className="px-4 py-2 text-right text-zinc-500 font-medium">Block Rewards</th>
                <th className="px-4 py-2 text-right text-zinc-500 font-medium">Total Earnings</th>
                <th className="px-4 py-2 text-right text-zinc-500 font-medium">RUNE Price</th>
                <th className="px-4 py-2 text-right text-zinc-500 font-medium">Avg Nodes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {earnings?.intervals?.slice(0, 15).map((interval, idx) => {
                const startDate = new Date(Number(interval.startTime)).toLocaleDateString();
                const endDate = new Date(Number(interval.endTime)).toLocaleDateString();
                return (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                      {startDate} - {endDate}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {formatRuneAmount(interval.bondingEarnings, 2)} RUNE
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {formatRuneAmount(interval.blockRewards, 2)} RUNE
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {formatRuneAmount(interval.earnings, 2)} RUNE
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      ${Number(interval.runePriceUSD).toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-mono">
                      {interval.avgNodeCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
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
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Per-Churn Reward Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
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
