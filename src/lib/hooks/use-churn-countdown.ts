import useSWR from 'swr';
import { getHealth } from '@/lib/api/midgard';
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
      const health = await getHealth();
      const blockHeight = health.lastThorNode?.height;
      if (!blockHeight) {
        throw new Error('Unable to fetch current block height');
      }
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
