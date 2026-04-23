import { useMemo } from 'react';
import { useAllNodes } from './use-all-nodes';
import { type BondPosition } from '@/lib/types/node';
import { runeToNumber } from '@/lib/utils/formatters';

export interface NodeRanking {
  nodeAddress: string;
  rank: number;
  totalNodes: number;
  percentile: number;
  isAtRisk: boolean;
  bondRank: number;
}

/**
 * Compute user's node rankings within the active set.
 * 
 * @param positions - Array of user's BondPosition[] to compute rankings for
 * @returns Array of NodeRanking for each position, or empty array if no data
 */
export function useNodeRankings(positions: BondPosition[]): NodeRanking[] {
  const { data: allNodes, isLoading } = useAllNodes();

  const rankings = useMemo(() => {
    if (!allNodes || allNodes.length === 0 || positions.length === 0) {
      return [];
    }

    // Filter to active nodes only and sort by bond (highest first)
    const activeNodes = allNodes
      .filter((node) => node.status === 'Active')
      .sort((a, b) => {
        const bondA = runeToNumber(a.total_bond);
        const bondB = runeToNumber(b.total_bond);
        return bondB - bondA;
      });

    const totalNodes = activeNodes.length;
    if (totalNodes === 0) {
      return [];
    }

    // Calculate the threshold for bottom 33% (at risk)
    const atRiskThreshold = Math.ceil(totalNodes * 0.33);

    return positions.map((position) => {
      // Find this node's rank in the active set
      const bondRank = activeNodes.findIndex(
        (node) => node.node_address === position.nodeAddress
      ) + 1; // 1-indexed

      // rank is the same as bondRank for active nodes
      // If node is not found in active set, rank is 0
      const rank = bondRank > 0 ? bondRank : 0;

      // Calculate percentile: what percentage of nodes have LESS bond than this node
      // (100% = top of the set, 0% = bottom of the set)
      const nodesWithLessBond = activeNodes.filter(
        (node) => runeToNumber(node.total_bond) < position.bondAmount
      ).length;
      const percentile = totalNodes > 1
        ? Math.round((nodesWithLessBond / (totalNodes - 1)) * 100)
        : 100;

      // isAtRisk: true if node is in bottom 33% of active set
      const isAtRisk = rank > 0 && rank > (totalNodes - atRiskThreshold);

      return {
        nodeAddress: position.nodeAddress,
        rank,
        totalNodes,
        percentile,
        isAtRisk,
        bondRank: rank,
      };
    });
  }, [allNodes, positions]);

  // Return empty array while loading to maintain consistent return type
  if (isLoading || !allNodes) {
    return [];
  }

  return rankings;
}
