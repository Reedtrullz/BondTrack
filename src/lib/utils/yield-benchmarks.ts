import { runeToNumber } from '@/lib/utils/formatters';
import { getAllNodes } from '@/lib/api/thornode';
import { NETWORK } from '../config';

export interface YieldBenchmarks {
  networkAverageAPY: number;
  topTierAPY: number;
  medianAPY: number;
}

/**
 * Calculate APY for a full node (100% bond share).
 * APY = (currentAward * churnsPerYear / totalBond) * 100
 */
function calculateNodeAPY(currentAward: string, totalBond: string): number {
  const award = runeToNumber(currentAward);
  const bond = runeToNumber(totalBond);
  if (bond === 0) return 0;
  return ((award * NETWORK.CHURNS_PER_YEAR) / bond) * 100;
}

/**
 * Calculate percentile from sorted array.
 * percentile: 0-100, e.g., 90 = top 10% (90th percentile)
 */
function getPercentile(sortedArr: number[], percentile: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
  return sortedArr[Math.min(index, sortedArr.length - 1)];
}

/**
 * Calculates network-wide APY benchmarks from actual active node data.
 * Computes real percentiles based on calculated node APYs.
 */
export async function fetchYieldBenchmarks(): Promise<YieldBenchmarks> {
  const nodes = await getAllNodes();
  const activeNodes = nodes.filter(n => n.status === 'Active');
  
  if (activeNodes.length === 0) {
    return { networkAverageAPY: 0, topTierAPY: 0, medianAPY: 0 };
  }

  // Calculate APY for each active node (assuming 100% bond ownership for node-level APY)
  const nodeAPYs = activeNodes
    .map(n => calculateNodeAPY(n.current_award, n.total_bond))
    .filter(apy => apy > 0 && apy < 100); // Filter outliers (>100% APY is unrealistic)

  if (nodeAPYs.length === 0) {
    return { networkAverageAPY: 0, topTierAPY: 0, medianAPY: 0 };
  }

  // Sort for percentile calculation
  const sortedAPYs = [...nodeAPYs].sort((a, b) => a - b);

  // Calculate real percentiles from network data
  const networkAverageAPY = sortedAPYs.reduce((a, b) => a + b, 0) / sortedAPYs.length;
  const medianAPY = getPercentile(sortedAPYs, 50);
  const topTierAPY = getPercentile(sortedAPYs, 90); // Top 10% of nodes

  return {
    networkAverageAPY: Math.round(networkAverageAPY * 10) / 10,
    topTierAPY: Math.round(topTierAPY * 10) / 10,
    medianAPY: Math.round(medianAPY * 10) / 10
  };
}

export function getYieldPerformanceColor(userAPY: number, benchmark: number): string {
  if (userAPY > benchmark * 1.1) return 'text-emerald-600 dark:text-emerald-400';
  if (userAPY < benchmark * 0.9) return 'text-red-600 dark:text-red-400';
  return 'text-zinc-600 dark:text-zinc-400';
}
