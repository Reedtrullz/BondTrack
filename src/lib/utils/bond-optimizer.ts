import { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';
import type { NodeRaw } from '@/lib/api/thornode';
import { NETWORK } from '@/lib/config';

export interface OptimizationSuggestion {
  currentNodeAddress: string;
  suggestedNodeAddress: string;
  currentAPY: number;
  suggestedAPY: number;
  potentialGain: number; // in percentage points
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

function hasActiveJail(node: NodeRaw): boolean {
  return 'release_height' in node.jail && typeof node.jail.release_height === 'number' && node.jail.release_height > 0;
}

function isRiskScreenedTarget(node: NodeRaw, currentNodeAddresses: Set<string>): boolean {
  return (
    node.status === 'Active' &&
    !currentNodeAddresses.has(node.node_address) &&
    !node.requested_to_leave &&
    !node.forced_to_leave &&
    !node.maintenance &&
    !hasActiveJail(node) &&
    node.slash_points < NETWORK.SLASH_POINT_THRESHOLDS.warning
  );
}

function getNodeBondRune(node: NodeRaw): number {
  const bond = Number(node.total_bond);
  return Number.isFinite(bond) ? bond / 1e8 : 0;
}

/**
 * Analyzes current positions against network benchmarks to suggest optimizations.
 */
export function analyzeBondOptimization(
  positions: BondPosition[],
  benchmarks: YieldBenchmarks,
  allNodes: NodeRaw[]
): OptimizationSuggestion[] {
  if (positions.length === 0) return [];

  const currentNodeAddresses = new Set(positions.map((position) => position.nodeAddress));
  const targetNode = allNodes
    .filter((node) => isRiskScreenedTarget(node, currentNodeAddresses))
    .sort((left, right) => {
      const slashComparison = left.slash_points - right.slash_points;
      if (slashComparison !== 0) return slashComparison;
      return getNodeBondRune(right) - getNodeBondRune(left);
    })[0];

  if (!targetNode) return [];

  const suggestions: OptimizationSuggestion[] = [];

  positions.forEach(pos => {
    // Only suggest moves for nodes underperforming the top tier
    if (pos.netAPY < benchmarks.topTierAPY) {
      const gain = benchmarks.topTierAPY - pos.netAPY;
      
      if (gain > 1.0) { // Only suggest if there is a >1% gain
        suggestions.push({
          currentNodeAddress: pos.nodeAddress,
          suggestedNodeAddress: targetNode.node_address,
          currentAPY: pos.netAPY,
          suggestedAPY: benchmarks.topTierAPY,
          potentialGain: gain,
          reason: pos.netAPY < benchmarks.networkAverageAPY
            ? 'Risk-screened yield review: below network average'
            : 'Risk-screened yield review: below top-tier benchmark',
          severity: gain > 3 ? 'high' : gain > 1.5 ? 'medium' : 'low'
        });
      }
    }
  });

  return suggestions;
}
