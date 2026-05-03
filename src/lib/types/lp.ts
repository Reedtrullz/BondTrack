export type LpPoolStatus = 'available' | 'staged' | 'suspended' | 'unknown';
export type LpPricingSource = 'historical' | 'current-only' | 'estimated';

export interface LpPosition {
  address: string;
  pool: string;
  assetSymbol: string;
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
  currentRunePriceUsd: number;
  currentAssetPriceUsd: number;
  entryRunePriceUsd: number | null;
  entryAssetPriceUsd: number | null;
  currentTotalValueUsd: number;
  depositedTotalValueUsd: number | null;
  netProfitLoss: string;
  netProfitLossUsd: number | null;
  netProfitLossPercent: number | null;
  hodlValueUsd: number | null;
  impermanentLossUsd: number | null;
  impermanentLossPercent: number | null;
  impermanentLossValue: number | null;
  pricingSource: LpPricingSource;
  
  // Backward-compatible aliases for existing consumers.
  runeEntryPrice: number | null;
  asset2EntryPrice: number | null;
}
