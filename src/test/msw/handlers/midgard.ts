import { http, HttpResponse } from 'msw';
import {
  BondDetailsRaw,
  EarningsHistoryRaw,
  RunePriceHistoryRaw,
  NetworkRaw,
} from '@/lib/api/midgard';

const mockBondDetails: BondDetailsRaw = {
  address: 'thor1provider123456789abcdef',
  totalBonded: '1253738138904',
  nodes: [
    {
      address: 'thor1abc123def456',
      bond: '1253738138904',
      status: 'Active',
    },
  ],
};

const mockEarningsHistory: EarningsHistoryRaw = {
  meta: {
    startTime: '1704067200000000000',
    endTime: '1706745600000000000',
    liquidityFees: '150000000000',
    blockRewards: '500000000000',
    earnings: '650000000000',
    bondingEarnings: '450000000000',
    liquidityEarnings: '200000000000',
    avgNodeCount: '80',
    runePriceUSD: '5.25',
    pools: [
      {
        pool: 'BTC.BTC',
        assetLiquidityFees: '75000000',
        runeLiquidityFees: '80000000',
        totalLiquidityFeesRune: '160000000',
        saverEarning: '20000000',
        rewards: '50000000',
        earnings: '70000000',
      },
    ],
  },
  intervals: [
    {
      startTime: '1704067200000000000',
      endTime: '1704153600000000000',
      liquidityFees: '50000000000',
      blockRewards: '160000000000',
      earnings: '210000000000',
      bondingEarnings: '145000000000',
      liquidityEarnings: '65000000000',
      avgNodeCount: '80',
      runePriceUSD: '5.20',
      pools: [
        {
          pool: 'BTC.BTC',
          assetLiquidityFees: '25000000',
          runeLiquidityFees: '26000000',
          totalLiquidityFeesRune: '52000000',
          saverEarning: '7000000',
          rewards: '16000000',
          earnings: '23000000',
        },
      ],
    },
    {
      startTime: '1704153600000000000',
      endTime: '1704240000000000000',
      liquidityFees: '48000000000',
      blockRewards: '165000000000',
      earnings: '213000000000',
      bondingEarnings: '147000000000',
      liquidityEarnings: '66000000000',
      avgNodeCount: '81',
      runePriceUSD: '5.22',
      pools: [
        {
          pool: 'BTC.BTC',
          assetLiquidityFees: '24000000',
          runeLiquidityFees: '25000000',
          totalLiquidityFeesRune: '50000000',
          saverEarning: '6500000',
          rewards: '15000000',
          earnings: '21500000',
        },
      ],
    },
    {
      startTime: '1704240000000000000',
      endTime: '1704326400000000000',
      liquidityFees: '52000000000',
      blockRewards: '175000000000',
      earnings: '227000000000',
      bondingEarnings: '158000000000',
      liquidityEarnings: '69000000000',
      avgNodeCount: '82',
      runePriceUSD: '5.28',
      pools: [
        {
          pool: 'BTC.BTC',
          assetLiquidityFees: '26000000',
          runeLiquidityFees: '29000000',
          totalLiquidityFeesRune: '56000000',
          saverEarning: '7500000',
          rewards: '18000000',
          earnings: '25500000',
        },
      ],
    },
  ],
};

const mockRunePriceHistory: RunePriceHistoryRaw = {
  meta: {
    startTime: '1704067200000000000',
    endTime: '1706745600000000000',
    startRunePriceUSD: '5.20',
    endRunePriceUSD: '5.25',
  },
  intervals: [
    {
      startTime: '1704067200000000000',
      endTime: '1704153600000000000',
      runePriceUSD: '5.20',
    },
    {
      startTime: '1704153600000000000',
      endTime: '1704240000000000000',
      runePriceUSD: '5.22',
    },
    {
      startTime: '1704240000000000000',
      endTime: '1704326400000000000',
      runePriceUSD: '5.28',
    },
    {
      startTime: '1704326400000000000',
      endTime: '1704412800000000000',
      runePriceUSD: '5.30',
    },
    {
      startTime: '1704412800000000000',
      endTime: '1704499200000000000',
      runePriceUSD: '5.25',
    },
    {
      startTime: '1704499200000000000',
      endTime: '1704585600000000000',
      runePriceUSD: '5.23',
    },
    {
      startTime: '1704585600000000000',
      endTime: '1704672000000000000',
      runePriceUSD: '5.18',
    },
    {
      startTime: '1704672000000000000',
      endTime: '1704758400000000000',
      runePriceUSD: '5.21',
    },
    {
      startTime: '1704758400000000000',
      endTime: '1704844800000000000',
      runePriceUSD: '5.24',
    },
    {
      startTime: '1704844800000000000',
      endTime: '1704931200000000000',
      runePriceUSD: '5.25',
    },
  ],
};

const mockNetwork: NetworkRaw = {
  activeBonds: ['100000000000000', '110000000000000'],
  activeNodeCount: '2',
  standbyBonds: ['50000000000000'],
  standbyNodeCount: '1',
  totalPooledRune: '850000000000000',
  totalReserve: '45000000000000',
  bondMetrics: {
    totalActiveBond: '125000000000000',
    totalStandbyBond: '50000000000000',
    averageActiveBond: '105000000000000',
    averageStandbyBond: '50000000000000',
    medianActiveBond: '105000000000000',
    minimumActiveBond: '100000000000000',
    maximumActiveBond: '110000000000000',
    bondHardCap: '110000000000000',
  },
  bondingAPY: '0.25',
  liquidityAPY: '0.15',
  blockRewards: {
    blockReward: '14000',
    bondReward: '14000',
    poolReward: '0',
  },
  nextChurnHeight: '25700000',
};

export const midgardHandlers = [
  http.get('/v2/bonds/:address', ({ params }) => {
    const { address } = params;

    if (address === 'thor1provider123456789abcdef') {
      return HttpResponse.json<BondDetailsRaw>(mockBondDetails);
    }

    return HttpResponse.json<BondDetailsRaw>({
      address: address as string,
      totalBonded: '0',
      nodes: [],
    });
  }),

  http.get('/v2/history/earnings', () => {
    return HttpResponse.json<EarningsHistoryRaw>(mockEarningsHistory);
  }),

  http.get('/v2/history/rune', () => {
    return HttpResponse.json<RunePriceHistoryRaw>(mockRunePriceHistory);
  }),

  http.get('/v2/network', () => {
    return HttpResponse.json<NetworkRaw>(mockNetwork);
  }),
];
