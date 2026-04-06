import { NodeRaw } from '@/lib/api/thornode';
import { runeToNumber, formatRuneAmount, formatBasisPoints } from '@/lib/utils/formatters';
import { calculateBondShare, calculateAPY } from '@/lib/utils/calculations';

export type YieldGuardFlag = 'overbonded' | 'highest_slash' | 'lowest_bond' | 'oldest' | 'leaving';

export interface BondPosition {
  nodeAddress: string;
  nodeOperatorAddress: string;
  bondAmount: number;
  bondSharePercent: number;
  status: string;
  operatorFee: number;
  operatorFeeFormatted: string;
  netAPY: number;
  totalBond: number;
  slashPoints: number;
  isJailed: boolean;
  jailReason?: string;
  version: string;
  requestedToLeave: boolean;
  yieldGuardFlags?: YieldGuardFlag[];
}

export function extractBondPositions(
  nodes: NodeRaw[],
  address: string
): BondPosition[] {
  return nodes
    .map((node) => {
      const provider = node.bond_providers?.providers?.find(
        (p) => p.bond_address === address
      );

      if (!provider) return null;

      const bondAmount = runeToNumber(provider.bond);
      const bondSharePercent = calculateBondShare(provider.bond, node.total_bond);
      const operatorFee = Number(node.bond_providers.node_operator_fee);
      const netAPY = calculateAPY(bondSharePercent, node.current_award, operatorFee, provider.bond);
      const isJailed = Object.keys(node.jail).length > 0;

      return {
        nodeAddress: node.node_address,
        nodeOperatorAddress: node.node_operator_address,
        bondAmount,
        bondSharePercent,
        status: node.status,
        operatorFee,
        operatorFeeFormatted: formatBasisPoints(node.bond_providers.node_operator_fee),
        netAPY,
        totalBond: runeToNumber(node.total_bond),
        slashPoints: node.slash_points,
        isJailed,
        jailReason: isJailed ? (node.jail as { reason?: string }).reason : undefined,
        version: node.version,
        requestedToLeave: node.requested_to_leave,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}
