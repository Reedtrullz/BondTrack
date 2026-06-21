import { describe, expect, it } from 'vitest';

import type { BondPosition } from '@/lib/types/node';
import { generateBondCsv } from './bond-export';

const position: BondPosition = {
  nodeAddress: 'thor1nodeexport000000000000000000000000000',
  nodeOperatorAddress: 'thor1operatorexport000000000000000000000',
  bondAmount: 1234.56,
  bondSharePercent: 12.5,
  status: 'Active',
  operatorFee: 2000,
  operatorFeeFormatted: '20.00%',
  netAPY: 4.2,
  totalBond: 9876.54,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '2.135.0',
  requestedToLeave: false,
};

describe('generateBondCsv', () => {
  it('keeps malformed source metrics unavailable instead of exporting fake zeroes or impossible percentages', () => {
    const csv = generateBondCsv([
      {
        ...position,
        bondAmount: Number.NaN,
        bondSharePercent: Number.NEGATIVE_INFINITY,
        operatorFee: Number.POSITIVE_INFINITY,
        operatorFeeFormatted: 'Infinity%',
        netAPY: Number.POSITIVE_INFINITY,
        slashPoints: Number.NaN,
      },
    ]);

    expect(csv).toContain('Node Address,Status,Bond Amount,Bond Share %,APY,Slash Points,Operator Fee,Jailed,Version');
    expect(csv).toContain('thor1nodeexport000000000000000000000000000,Active,--,--,--,--,--,No,2.135.0');
    expect(csv).not.toMatch(/NaN|Infinity/);
    expect(csv).not.toContain('ᚱ0.00');
  });
});
