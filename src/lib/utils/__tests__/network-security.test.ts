import { describe, expect, it } from 'vitest';
import { calculateNetworkSecurityState } from '../calculations';

describe('network security state', () => {
  it('marks ratios above 2.5x as high bond buffer without a safety verdict', () => {
    expect(calculateNetworkSecurityState(2.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Bond buffer in range',
    });

    expect(calculateNetworkSecurityState(9.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Bond buffer high',
    });
  });

  it('marks ratios from 1.5x through 2.5x as in range', () => {
    expect(calculateNetworkSecurityState(1.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Bond buffer in range',
    });

    expect(calculateNetworkSecurityState(2.49)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Bond buffer in range',
    });
  });

  it('marks ratios from 1.0x up to but not including 1.5x as warning and building', () => {
    expect(calculateNetworkSecurityState(1.0)).toEqual({
      securityHealth: 'warning',
      solvencyStatus: 'Bond buffer building',
    });

    expect(calculateNetworkSecurityState(1.49)).toEqual({
      securityHealth: 'warning',
      solvencyStatus: 'Bond buffer building',
    });
  });

  it('marks ratios below 1.0x as at-risk', () => {
    expect(calculateNetworkSecurityState(0.99)).toEqual({
      securityHealth: 'at-risk',
      solvencyStatus: 'Liquidity above bond',
    });

    expect(calculateNetworkSecurityState(0)).toEqual({
      securityHealth: 'at-risk',
      solvencyStatus: 'Liquidity above bond',
    });
  });
});
