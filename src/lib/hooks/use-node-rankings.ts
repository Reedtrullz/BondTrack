import { useMemo } from 'react';
import { useAllNodes } from './use-all-nodes';
import { type BondPosition } from '@/lib/types/node';
import type { NodeRaw } from '@/lib/api/thornode';
import { rawRuneToPositiveDisplayNumber } from '@/lib/utils/formatters';

export type RankUnavailableReason = 'unusable_active_bond_source';

export interface NodeRanking {
  nodeAddress: string;
  rank: number;
  totalNodes: number;
  percentile: number;
  isAtRisk: boolean;
  bondRank: number;
  excludedActiveNodeCount?: number;
  rankUnavailableReason?: RankUnavailableReason;
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

    const allActiveNodes = allNodes.filter((node) => node.status === 'Active');
    const activeNodes = allActiveNodes
      .map((node) => ({
        node,
        totalBond: rawRuneToPositiveDisplayNumber(node.total_bond),
      }))
      .filter((entry): entry is { node: NodeRaw; totalBond: number } => entry.totalBond !== null)
      .sort((a, b) => {
        return b.totalBond - a.totalBond;
      });
    const excludedActiveNodeCount = allActiveNodes.length - activeNodes.length;

    const totalNodes = activeNodes.length;
    if (totalNodes === 0) {
      if (allActiveNodes.length > 0) {
        return positions.map((position) => ({
          nodeAddress: position.nodeAddress,
          rank: 0,
          totalNodes: 0,
          percentile: 0,
          isAtRisk: false,
          bondRank: 0,
          excludedActiveNodeCount: allActiveNodes.length,
          rankUnavailableReason: 'unusable_active_bond_source' as const,
        }));
      }

      return [];
    }

    const atRiskThreshold = Math.ceil(totalNodes * 0.33);

    return positions.map((position) => {
      const rank = activeNodes.findIndex(
        (entry) => entry.node.node_address === position.nodeAddress
      ) + 1;
      const bondRank = rank > 0 ? rank : 0;
      const matchedActiveNode = activeNodes.find((entry) => entry.node.node_address === position.nodeAddress);
      const nodeTotalBond = matchedActiveNode?.totalBond ?? (
        Number.isFinite(position.totalBond) && position.totalBond > 0 ? position.totalBond : null
      );
      const nodesWithLessBond = nodeTotalBond !== null
        ? activeNodes.filter((entry) => entry.totalBond < nodeTotalBond).length
        : 0;
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
        excludedActiveNodeCount,
      };
    });
  }, [allNodes, positions]);

  if (isLoading || !allNodes) {
    return [];
  }

  return rankings;
}
