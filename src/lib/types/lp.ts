export type LpPoolStatus = 'available' | 'staged' | 'suspended' | 'unknown';

export interface LpPosition {
  address: string;
  pool: string;
  runeDeposit: string;
  asset2Deposit: string;
  liquidityUnits: string;
  runeAdded: string;
  runePending: string;
  runeWithdrawn: string;
  asset2Added: string;
  asset2Pending: string;
  asset2Withdrawn: string;
  volume24h: string;
  runeDepth: string;
  asset2Depth: string;
  dateFirstAdded: string;
  dateLastAdded: string;
  poolApy: number;
  poolStatus: LpPoolStatus;
  ownershipPercent: number;
  hasPending: boolean;
  
  runeDepositedValue: string;
  asset2DepositedValue: string;
  runeWithdrawable: string;
  asset2Withdrawable: string;
  netProfitLoss: string;
  netProfitLossPercent: number;
  impermanentLossPercent?: number;
  impermanentLossValue?: number;
}
