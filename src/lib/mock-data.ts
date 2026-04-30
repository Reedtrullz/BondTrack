export interface MockBondPosition {
  nodeAddress: string;
  bondAmount: string;
  status: string;
  netAPY: number;
  operatorFee: number;
  slashPoints: number;
  isJailed: boolean;
}

export const MOCK_BOND_POSITIONS: MockBondPosition[] = [
  {
    nodeAddress: 'thor1qlfaaz6zyt80xk7vxa6n7kmzp0ncz8rwzpaj9h',
    bondAmount: '100000000000',
    status: 'Active',
    netAPY: 0.125,
    operatorFee: 500,
    slashPoints: 12,
    isJailed: false,
  },
  {
    nodeAddress: 'thor1abc123def456ghi789jkl012mno345pqr678stu',
    bondAmount: '50000000000',
    status: 'Standby',
    netAPY: 0.10,
    operatorFee: 300,
    slashPoints: 0,
    isJailed: false,
  },
];

export const MOCK_RUNE_PRICE = 0.4972;

export const MOCK_EARNINGS_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  time: Date.now() - (29 - i) * 86400 * 1000,
  earnings: Math.floor(Math.random() * 50000) + 50000,
}));

export const MOCK_MEMBER_DATA = {
  pools: [
    {
      pool: 'BTC.BTC',
      liquidityProviderUnits: '1000000000',
      pendingLiquidityProviderUnits: '0',
      poolUnits: '6255885235',
      balance_rune: '62558852',
      balance_asset: '100',
      poolAPY: 0.085,
      annualPercentageRate: 0.082,
      status: 'available',
    },
    {
      pool: 'ETH.ETH',
      liquidityProviderUnits: '500000000',
      pendingLiquidityProviderUnits: '0',
      poolUnits: '2427476779',
      balance_rune: '24274767',
      balance_asset: '500',
      poolAPY: 0.092,
      annualPercentageRate: 0.089,
      status: 'available',
    },
  ],
  runeAddress: 'thor1qlfaaz6zyt80xk7vxa6n7kmzp0ncz8rwzpaj9h',
  assetAddress: '',
  lastAddedLiquidityHeight: 1234567,
};

export const MOCK_NODES = [
  {
    address: 'thor1qlfaaz6zyt80xk7vxa6n7kmzp0ncz8rwzpaj9h',
    status: 'Active',
    bond: '100000000000',
    slashPoints: 12,
    currentAPY: 0.125,
    operatorFee: 500,
  },
];

export function isDevelopmentMode(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return true;
  }
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  return false;
}
