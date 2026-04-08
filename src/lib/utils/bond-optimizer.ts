import { BondPosition } from '@/lib/types/node';
import { YieldBenchmarks } from '@/lib/utils/yield-benchmarks';

export interface OptimizationSuggestion {
  currentNodeAddress: string;
  suggestedNodeAddress: string;
  currentAPY: number;
  suggestedAPY: number;
  potentialGain: number; // in percentage points
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Analyzes current positions against network benchmarks to suggest optimizations.
 */
export function analyzeBondOptimization(
  positions: BondPosition[],
  benchmarks: YieldBenchmarks,
  allNodes: any[] // NodeRaw[]
): OptimizationSuggestion[] {
  if (positions.length === 0) return [];

  // Find top performing active nodes as targets for optimization
  const activeNodes = allNodes.filter(n => n.status === 'Active');
  
  // This is a simplified heuristic for "Top Nodes"
  // In a full implementation, we would calculate actual APY for all active nodes
  const topNodes = activeNodes
    .sort((a, b) => (b.slash_points || 0) - (a.slash_points || 0)) // Basic proxy for stability
    .slice(0, 5);

  const suggestions: OptimizationSuggestion[] = [];

  positions.forEach(pos => {
    // Only suggest moves for nodes underperforming the top tier
    if (pos.netAPY < benchmarks.topTierAPY) {
      const gain = benchmarks.topTierAPY - pos.netAPY;
      
      if (gain > 1.0) { // Only suggest if there is a >1% gain
        suggestions.push({
          currentNodeAddress: pos.nodeAddress,
          suggestedNodeAddress: topNodes[0]?.node_address || 'Unknown',
          currentAPY: pos.netAPY,
          suggestedAPY: benchmarks.topTierAPY,
          potentialGain: gain,
          reason: pos.netAPY < benchmarks.networkAverageAPY 
            ? 'Significantly underperforming network average' 
            : 'Sub-optimal yield compared to top-tier nodes',
          severity: gain > 3 ? 'high' : gain > 1.5 ? 'medium' : 'low'
        });
      }
    }
  });

  return suggestions;
}
