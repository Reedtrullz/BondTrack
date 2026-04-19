export type LpPoolStatus = 'available' | 'staged' | 'suspended' | 'unknown';

export interface LpPosition {
  address: string;
  pool: string;
  runeDeposit: string;
  liquidityUnits: string;
  runeAdded: string;
  runePending: string;
  runeWithdrawn: string;
  volume24h: string;
  runeDepth: string;
  dateFirstAdded: string;
  dateLastAdded: string;
  poolApy: number;
  poolStatus: LpPoolStatus;
  ownershipPercent: number;
  hasPending: boolean;
}
