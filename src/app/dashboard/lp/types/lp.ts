export interface MemberPoolRaw {
  pool: string;
  assetAddress: string;
  runeDeposit: string;
  assetDeposit: string;
  runePending: string;
  assetPending: string;
  runeAdded: string;
  runeWithdrawn: string;
  assetAdded: string;
  assetWithdrawn: string;
  liquidityUnits: string;
  dateFirstAdded: number;
  dateLastAdded: number;
}

export interface PoolDetailsRaw {
  asset: string;
  status: 'available' | 'staged' | 'suspended' | 'unknown';
  poolAPY: string;
  volume24h: string;
  runeDepth: string;
  assetDepth: string;
  liquidityUnits: string;
}

export interface LiquidityProviderRaw {
  rune_redeem_value: string;
  asset_redeem_value: string;
  rune_deposit_value: string;
  asset_deposit_value: string;
}

export interface LPData {
  memberDetails: { pools: MemberPoolRaw[] } | null;
  pools: PoolDetailsRaw[];
  thorNodeLpData: Map<string, LiquidityProviderRaw>;
  runePriceUSD: number;
}
