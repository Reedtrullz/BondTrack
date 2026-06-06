import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToCSV, generateTaxReport, parseTaxDateRange, type TaxReportRow } from '../tax-export';
import {
  getActions,
  getEarningsHistory,
  getMemberDetails,
  getPoolHistory,
  getPools,
  getRunePriceHistory,
  type ActionRaw,
} from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard', () => ({
  getActions: vi.fn(),
  getMemberDetails: vi.fn(),
  getEarningsHistory: vi.fn(),
  getPoolHistory: vi.fn(),
  getPools: vi.fn(),
  getRunePriceHistory: vi.fn(),
}));

const mockGetActions = vi.mocked(getActions);
const mockGetRunePriceHistory = vi.mocked(getRunePriceHistory);
const mockGetMemberDetails = vi.mocked(getMemberDetails);
const mockGetEarningsHistory = vi.mocked(getEarningsHistory);
const mockGetPools = vi.mocked(getPools);
const mockGetPoolHistory = vi.mocked(getPoolHistory);

function timestamp(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000);
}

function midgardDate(date: string): string {
  return (BigInt(timestamp(date)) * 1_000_000_000n).toString();
}

function action(overrides: Partial<ActionRaw>): ActionRaw {
  return {
    type: 'bond',
    date: midgardDate('2024-01-01'),
    height: '1',
    pools: [],
    memo: '',
    tx: {
      type: '',
      address: 'thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      coins: [],
      txID: 'tx',
      chain: 'THOR',
      fromAddress: 'thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    status: 'success',
    ...overrides,
  };
}

describe('generateTaxReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMemberDetails.mockResolvedValue({ pools: [] });
    mockGetEarningsHistory.mockResolvedValue({ meta: {} as never, intervals: [] });
    mockGetPools.mockResolvedValue([]);
    mockGetPoolHistory.mockResolvedValue({ intervals: [] });
  });

  it('prices pre-period bond lots from the earliest included bond action for FIFO cost basis', async () => {
    const prePeriodBondTimestamp = timestamp('2023-12-15');

    mockGetActions.mockResolvedValue({
      count: '2',
      actions: [
        action({
          type: 'bond',
          date: midgardDate('2023-12-15'),
          memo: 'BOND:thor1node',
          in: [{ address: 'thor1owner', txID: 'bond-tx', coins: [{ asset: 'THOR.RUNE', amount: '1000000000' }] }],
        }),
        action({
          type: 'unbond',
          date: midgardDate('2024-01-10'),
          memo: 'UNBOND:thor1node',
          out: [{ address: 'thor1owner', txID: 'unbond-tx', coins: [{ asset: 'THOR.RUNE', amount: '500000000' }] }],
        }),
      ],
    });

    mockGetRunePriceHistory.mockImplementation(async (_interval, _count, from) => ({
      meta: {} as never,
      intervals: [
        ...(from !== undefined && from <= prePeriodBondTimestamp
          ? [{ startTime: String(prePeriodBondTimestamp), endTime: String(prePeriodBondTimestamp + 86_400), runePriceUSD: '2' }]
          : []),
        { startTime: String(timestamp('2024-01-10')), endTime: String(timestamp('2024-01-11')), runePriceUSD: '4' },
      ],
    }));

    const rows = await generateTaxReport('thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2024-01-01', '2024-01-31');

    expect(mockGetRunePriceHistory).toHaveBeenCalledWith(
      'day',
      undefined,
      prePeriodBondTimestamp,
      timestamp('2024-02-01') - 1
    );
    expect(rows).toEqual([
      expect.objectContaining({
        date: '2024-01-10',
        type: 'bond',
        amountRune: 5,
        amountUSD: 20,
        costBasis: 10,
        gainLoss: 10,
        confidence: 'high',
      }),
    ]);
  });

  it('falls back to the UNBOND memo base-unit amount when Midgard RUNE coins are absent', async () => {
    mockGetActions.mockResolvedValue({
      count: '2',
      actions: [
        action({
          type: 'bond',
          date: midgardDate('2024-01-01'),
          memo: 'BOND:thor1node',
          in: [{ address: 'thor1owner', txID: 'bond-tx', coins: [{ asset: 'THOR.RUNE', amount: '500000000' }] }],
        }),
        action({
          type: 'unbond',
          date: midgardDate('2024-01-10'),
          memo: 'UNBOND:thor1node:250000000',
          tx: {
            type: '',
            address: 'thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            coins: [],
            txID: 'unbond-tx',
            chain: 'THOR',
            fromAddress: 'thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
          in: [],
          out: [],
        }),
      ],
    });
    mockGetRunePriceHistory.mockResolvedValue({
      meta: {} as never,
      intervals: [
        { startTime: String(timestamp('2024-01-01')), endTime: String(timestamp('2024-01-02')), runePriceUSD: '3' },
        { startTime: String(timestamp('2024-01-10')), endTime: String(timestamp('2024-01-11')), runePriceUSD: '4' },
      ],
    });

    const rows = await generateTaxReport('thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2024-01-01', '2024-01-31');

    expect(rows).toContainEqual(expect.objectContaining({
      date: '2024-01-10',
      type: 'bond',
      amountRune: 2.5,
      amountUSD: 10,
      costBasis: 7.5,
      gainLoss: 2.5,
    }));
  });

  it('prefers metadata.refund.txType over action.type and memo when classifying tax actions', async () => {
    mockGetActions.mockResolvedValue({
      count: '2',
      actions: [
        action({
          type: 'bond',
          date: midgardDate('2024-01-01'),
          memo: 'BOND:thor1node',
          in: [{ address: 'thor1owner', txID: 'bond-tx', coins: [{ asset: 'THOR.RUNE', amount: '500000000' }] }],
        }),
        action({
          type: 'bond',
          date: midgardDate('2024-01-10'),
          memo: 'BOND:thor1node',
          metadata: { refund: { memo: 'UNBOND:thor1node', txType: 'UNBOND' } },
          out: [{ address: 'thor1owner', txID: 'unbond-tx', coins: [{ asset: 'THOR.RUNE', amount: '250000000' }] }],
        }),
      ],
    });
    mockGetRunePriceHistory.mockResolvedValue({
      meta: {} as never,
      intervals: [
        { startTime: String(timestamp('2024-01-01')), endTime: String(timestamp('2024-01-02')), runePriceUSD: '3' },
        { startTime: String(timestamp('2024-01-10')), endTime: String(timestamp('2024-01-11')), runePriceUSD: '4' },
      ],
    });

    const rows = await generateTaxReport('thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2024-01-01', '2024-01-31');

    expect(rows).toContainEqual(expect.objectContaining({
      date: '2024-01-10',
      amountRune: 2.5,
      amountUSD: 10,
      costBasis: 7.5,
      gainLoss: 2.5,
    }));
  });

  it('labels LP rows as current-position estimates', async () => {
    mockGetActions.mockResolvedValue({ count: '0', actions: [] });
    mockGetMemberDetails.mockResolvedValue({
      pools: [{ pool: 'BTC.BTC', liquidityUnits: '10' } as never],
    });
    mockGetPools.mockResolvedValue([{ asset: 'BTC.BTC', liquidityUnits: '100' } as never]);
    mockGetEarningsHistory.mockResolvedValue({
      meta: {} as never,
      intervals: [{
        startTime: String(timestamp('2024-01-10')),
        endTime: String(timestamp('2024-01-11')),
        pools: [{ pool: 'BTC.BTC', earnings: '10000000000' }],
      } as never],
    });
    mockGetPoolHistory.mockResolvedValue({
      intervals: [{ startTime: String(timestamp('2024-01-10')), liquidityUnits: '100' } as never],
    });
    mockGetRunePriceHistory.mockResolvedValue({
      meta: {} as never,
      intervals: [{ startTime: String(timestamp('2024-01-10')), endTime: String(timestamp('2024-01-11')), runePriceUSD: '2' }],
    });

    const rows = await generateTaxReport('thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2024-01-01', '2024-01-31');

    expect(rows).toContainEqual(expect.objectContaining({
      type: 'lp',
      amountRune: 10,
      confidence: 'estimated',
      confidenceLabel: expect.stringContaining('current-position estimate'),
    }));
  });
});

describe('parseTaxDateRange', () => {
  it('treats the end date as an inclusive UTC day', () => {
    expect(parseTaxDateRange('2024-04-24', '2024-04-24')).toEqual({
      startTimestamp: 1713916800,
      endTimestamp: 1714003199,
    });
  });

  it('rejects ambiguous date formats and reversed ranges', () => {
    expect(() => parseTaxDateRange('04/24/2024', '2024-04-25')).toThrow('YYYY-MM-DD');
    expect(() => parseTaxDateRange('2024-04-25', '2024-04-24')).toThrow('before or equal');
  });
});

describe('exportToCSV', () => {
  it('exports headers and formatted rows with confidence metadata', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-04-24',
        type: 'bond',
        asset: 'RUNE',
        amountRune: 12.3456789,
        amountUSD: 1234.567,
        costBasis: 1000,
        gainLoss: 234.567,
        confidence: 'high',
      },
      {
        date: '2024-04-25',
        type: 'lp',
        asset: 'ATOM',
        amountRune: 1,
        amountUSD: 9.5,
        costBasis: 0,
        gainLoss: 9.5,
        confidence: 'estimated',
      },
    ];

    expect(exportToCSV(rows)).toBe(
      [
        'Date,Type,Asset,Amount_RUNE,Amount_USD,Cost_Basis,Gain_Loss,Confidence',
        '2024-04-24,bond,RUNE,12.34567890,1234.57,1000.00,234.57,high',
        '2024-04-25,lp,ATOM,1.00000000,9.50,0.00,9.50,estimated',
      ].join('\n')
    );
  });

  it('preserves CSV-friendly formatting for simple row values', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-05-01',
        type: 'bond',
        asset: 'RUNE',
        amountRune: 0.5,
        amountUSD: 1.25,
        costBasis: 1,
        gainLoss: 0.25,
      },
    ];

    expect(exportToCSV(rows)).toContain('2024-05-01,bond,RUNE,0.50000000,1.25,1.00,0.25,high');
  });

  it('includes confidence labels in the CSV confidence column', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-05-01',
        type: 'lp',
        asset: 'RUNE',
        amountRune: 0.5,
        amountUSD: 1.25,
        costBasis: 0,
        gainLoss: 1.25,
        confidence: 'estimated',
        confidenceLabel: 'current-position estimate; historical LP add/withdraw reconstruction is not implemented',
      },
    ];

    expect(exportToCSV(rows)).toContain(
      '2024-05-01,lp,RUNE,0.50000000,1.25,0.00,1.25,estimated (current-position estimate; historical LP add/withdraw reconstruction is not implemented)'
    );
  });

  it('escapes fields that contain commas or quotes', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-05-01',
        type: 'bond',
        asset: 'RUNE,"SPECIAL"',
        amountRune: 1,
        amountUSD: 2,
        costBasis: 3,
        gainLoss: 4,
        confidence: 'low',
      },
    ];

    expect(exportToCSV(rows)).toBe(
      [
        'Date,Type,Asset,Amount_RUNE,Amount_USD,Cost_Basis,Gain_Loss,Confidence',
        '2024-05-01,bond,"RUNE,""SPECIAL""",1.00000000,2.00,3.00,4.00,low',
      ].join('\n')
    );
  });

  it('returns only headers for empty rows', () => {
    expect(exportToCSV([])).toBe('Date,Type,Asset,Amount_RUNE,Amount_USD,Cost_Basis,Gain_Loss,Confidence');
  });
});
