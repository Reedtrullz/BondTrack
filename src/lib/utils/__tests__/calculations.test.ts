import { describe, it, expect } from 'vitest';
import { calculateBondRank, calculateBondShare, calculateNetworkSecurityState } from '../calculations';

describe('calculateNetworkSecurityState', () => {
  it('marks ratios above 2.5x as high bond buffer without a safety verdict', () => {
    const result = calculateNetworkSecurityState(2.5);

    expect(result.securityHealth).toBe('healthy');
    expect(result.solvencyStatus).toBe('Bond buffer in range');

    const highResult = calculateNetworkSecurityState(2.51);

    expect(highResult.securityHealth).toBe('healthy');
    expect(highResult.solvencyStatus).toBe('Bond buffer high');
  });

  it('marks ratios between 1.5x and 2.5x as in range', () => {
    const result = calculateNetworkSecurityState(1.7);

    expect(result.securityHealth).toBe('healthy');
    expect(result.solvencyStatus).toBe('Bond buffer in range');
  });

  it('marks ratios between 1.0x and 1.5x as warning and building', () => {
    const result = calculateNetworkSecurityState(1.2);

    expect(result.securityHealth).toBe('warning');
    expect(result.solvencyStatus).toBe('Bond buffer building');
  });

  it('marks ratios below 1.0x as at-risk and undercapitalized', () => {
    const result = calculateNetworkSecurityState(0.8);

    expect(result.securityHealth).toBe('at-risk');
    expect(result.solvencyStatus).toBe('Liquidity above bond');
  });
});

describe('calculateBondRank', () => {
  const nodes = [
    { node_address: 'a', total_bond: '300000000000' },
    { node_address: 'b', total_bond: '100000000000' },
    { node_address: 'c', total_bond: '200000000000' },
  ];

  it('ranks by target total node bond instead of matching the first node by value', () => {
    expect(calculateBondRank('200000000000', nodes)).toEqual({
      rank: 2,
      total: 3,
      percentile: 50,
    });
  });

  it('returns the lowest percentile for the bottom active bond', () => {
    expect(calculateBondRank('100000000000', nodes)).toEqual({
      rank: 3,
      total: 3,
      percentile: 0,
    });
  });
});

describe('calculateBondShare', () => {
  it('returns unknown instead of throwing when total bond source data is malformed', () => {
    expect(calculateBondShare('1250000000000', 'not-a-number')).toBeNaN();
  });

  it('returns unknown instead of throwing when provider bond source data is malformed', () => {
    expect(calculateBondShare('not-a-number', '2500000000000')).toBeNaN();
  });
});
