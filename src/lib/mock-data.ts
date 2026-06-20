export interface MockBondPosition {
  nodeAddress: string;
  bondAmount: string;
  status: string;
  netAPY: number;
  operatorFee: number;
  slashPoints: number;
  isJailed: boolean;
}

export const MOCK_PROVIDER_ADDRESS = 'thor1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5e949nr';
export const MOCK_SECONDARY_PROVIDER_ADDRESS = 'thor1z5tpwxqergd3c8g7ruszzg3rysjjvfegwqptm4';
export const MOCK_ACTIVE_NODE_ADDRESS = 'thor19y4zktpd9chnqvfjxv6r2d3h8qun5weu08uk0l';
export const MOCK_STANDBY_NODE_ADDRESS = 'thor185lr7szpgfp5g32xgayyjjjtf3x5un6s4965w4';
export const MOCK_ACTIVE_OPERATOR_ADDRESS = 'thor129f9x4z42et4sk26tdw96hjlvpskycmy96y988';
export const MOCK_STANDBY_OPERATOR_ADDRESS = 'thor1v4nxw6rfdf4kcmtwdac8zunnw36hvamcea8m74';

export const MOCK_BOND_POSITIONS: MockBondPosition[] = [
  {
    nodeAddress: MOCK_ACTIVE_NODE_ADDRESS,
    bondAmount: '100000000000',
    status: 'Active',
    netAPY: 0.125,
    operatorFee: 500,
    slashPoints: 12,
    isJailed: false,
  },
  {
    nodeAddress: MOCK_STANDBY_NODE_ADDRESS,
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
  runeAddress: MOCK_PROVIDER_ADDRESS,
  assetAddress: '',
  lastAddedLiquidityHeight: 1234567,
};

export const MOCK_NODES = [
  {
    address: MOCK_ACTIVE_NODE_ADDRESS,
    status: 'Active',
    bond: '100000000000',
    slashPoints: 12,
    currentAPY: 0.125,
    operatorFee: 500,
  },
];

export function isDevelopmentMode(): boolean {
  // Disable mock mode in test environment
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
}
