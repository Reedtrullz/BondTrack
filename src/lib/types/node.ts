import { NodeRaw } from '@/lib/api/thornode';
import { runeToNumber, formatRuneAmount, formatBasisPoints } from '@/lib/utils/formatters';
import { calculateBondShare, calculateAPY } from '@/lib/utils/calculations';

export type YieldGuardFlag = 'overbonded' | 'highest_slash' | 'lowest_bond' | 'oldest' | 'leaving';

export interface PooledNodeData {
  isPooled: boolean;
  totalProviders: number;
  otherProviders: { address: string; bond: number; sharePercent: number }[];
  yourSharePercent: number;
}

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
  jailReleaseHeight: number;
  jailReason?: string;
  version: string;
  requestedToLeave: boolean;
  yieldGuardFlags?: YieldGuardFlag[];
  pooledNodeData?: PooledNodeData;
}

export function extractBondPositions(
  nodes: NodeRaw[],
  address: string,
  currentBlockHeight: number
): BondPosition[] {
  return nodes
    .map((node) => {
      const provider = node.bond_providers?.providers?.find(
        (p) => p.bond_address === address
      );

      if (!provider) return null;

      const jail = node.jail as { release_height?: number; reason?: string } | Record<string, never>;
      const isJailed = typeof jail?.release_height === 'number' && typeof jail?.reason === 'string';
      const jailReleaseHeight = isJailed ? jail.release_height : 0;

      const bondAmount = runeToNumber(provider.bond);
      const bondSharePercent = calculateBondShare(provider.bond, node.total_bond);
      const operatorFee = Number(node.bond_providers.node_operator_fee);
      const netAPY = calculateAPY(bondSharePercent, node.current_award, operatorFee, provider.bond);
      const providers = node.bond_providers?.providers ?? [];
      const isPooled = providers.length > 1;

      let pooledNodeData: PooledNodeData | undefined;
      if (isPooled) {
        const totalBond = runeToNumber(node.total_bond);
        const otherProviders = providers
          .filter((p) => p.bond_address !== address)
          .map((p) => {
            const bond = runeToNumber(p.bond);
            const sharePercent = calculateBondShare(p.bond, node.total_bond);
            const addr = p.bond_address;
            const anonymized = addr.length > 12
              ? `${addr.slice(0, 8)}...${addr.slice(-4)}`
              : addr;
            return { address: anonymized, bond, sharePercent };
          });

        pooledNodeData = {
          isPooled: true,
          totalProviders: providers.length,
          otherProviders,
          yourSharePercent: bondSharePercent,
        };
      }

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
        jailReleaseHeight,
        jailReason: isJailed ? jail?.reason : undefined,
        version: node.version,
        requestedToLeave: node.requested_to_leave,
        pooledNodeData,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}
