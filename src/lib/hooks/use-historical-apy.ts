import useSWR from 'swr';
import { getEarningsHistory, getNetwork } from '@/lib/api/midgard';

export function useHistoricalApy(days = 180) {
  const { data: earnings, isLoading: isLoadingEarnings } = useSWR(
    ['historical-earnings', days],
    () => getEarningsHistory('day', days),
    { refreshInterval: 3600000 } // 1 hour
  );

  const { data: network, isLoading: isLoadingNetwork } = useSWR(
    'network-metrics',
    () => getNetwork(),
    { refreshInterval: 60000 }
  );

  const historicalApy = (() => {
    if (!earnings?.intervals?.length || !network?.bondMetrics?.totalActiveBond) return null;

    const totalBondingEarnings = earnings.intervals.reduce(
      (sum, interval) => sum + (Number(interval.bondingEarnings) || 0), 
      0
    );

    const activeBond = Number(network.bondMetrics.totalActiveBond) / 1e8;
    const earningsRune = totalBondingEarnings / 1e8;

    // Annualize based on the period
    const actualDays = earnings.intervals.length;
    const periodicRate = earningsRune / activeBond;
    const apy = (periodicRate / actualDays) * 365 * 100;

    return apy;
  })();

  return {
    historicalApy,
    isLoading: isLoadingEarnings || isLoadingNetwork,
  };
}
