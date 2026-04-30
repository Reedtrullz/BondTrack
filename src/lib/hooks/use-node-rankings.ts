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
 * Uses the node's total bond, not the user's provider share, because churn risk is
 * determined by validator bond rank in the active set.
 */
export function useNodeRankings(positions: BondPosition[]): NodeRanking[] {
  const { data: allNodes, isLoading } = useAllNodes();

  const rankings = useMemo(() => {
    if (!allNodes || allNodes.length === 0 || positions.length === 0) {
      return [];
    }

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

    const atRiskThreshold = Math.ceil(totalNodes * 0.33);

    return positions.map((position) => {
      const rank = activeNodes.findIndex(
        (node) => node.node_address === position.nodeAddress
      ) + 1;
      const bondRank = rank > 0 ? rank : 0;
      const nodeTotalBond = position.totalBond;
      const nodesWithLessBond = activeNodes.filter(
        (node) => runeToNumber(node.total_bond) < nodeTotalBond
      ).length;
      const percentile = totalNodes > 1 && bondRank > 0
        ? Math.round((nodesWithLessBond / (totalNodes - 1)) * 100)
        : bondRank > 0 ? 100 : 0;

      const isAtRisk = bondRank > 0 && bondRank > (totalNodes - atRiskThreshold);

      return {
        nodeAddress: position.nodeAddress,
        rank: bondRank,
        totalNodes,
        percentile,
        isAtRisk,
        bondRank,
      };
    });
  }, [allNodes, positions]);

  if (isLoading || !allNodes) {
    return [];
  }

  return rankings;
}
