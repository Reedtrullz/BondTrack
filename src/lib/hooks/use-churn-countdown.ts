import useSWR from 'swr';
import { getNetworkConstants } from '@/lib/api/thornode';
import { NETWORK } from '@/lib/config';

interface ChurnCountdownData {
  blocksRemaining: number;
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
  };
  estimatedSeconds: number;
}

function calculateChurnCountdown(blockHeight: number): ChurnCountdownData {
  const blocksSinceChurn = blockHeight % NETWORK.CHURN_INTERVAL_BLOCKS;
  const blocksRemaining = NETWORK.CHURN_INTERVAL_BLOCKS - blocksSinceChurn;
  const estimatedSeconds = blocksRemaining * 6;

  const days = Math.floor(estimatedSeconds / 86400);
  const hours = Math.floor((estimatedSeconds % 86400) / 3600);
  const minutes = Math.floor((estimatedSeconds % 3600) / 60);

  return {
    blocksRemaining,
    timeRemaining: { days, hours, minutes },
    estimatedSeconds,
  };
}

export function useChurnCountdown() {
  const { data, error, isLoading, mutate } = useSWR<ChurnCountdownData>(
    'churn-countdown',
    async () => {
      const constants = await getNetworkConstants();
      const blockHeight = constants.int_64_values?.block_height || constants.int_64_values?.last_observed_height || 0;
      return calculateChurnCountdown(blockHeight);
    },
    {
      refreshInterval: 60_000,
      errorRetryInterval: 5_000,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
