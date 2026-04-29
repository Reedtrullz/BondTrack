import { describe, expect, it } from 'vitest';
import { calculateNetworkSecurityState } from '../calculations';

describe('network security state', () => {
  it('marks ratios at or above 2.0x as healthy', () => {
    expect(calculateNetworkSecurityState(2)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Economically Secure',
    });

    expect(calculateNetworkSecurityState(9.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Economically Secure',
    });
  });

  it('marks ratios from 1.5x up to but not including 2.0x as warning', () => {
    expect(calculateNetworkSecurityState(1.5)).toEqual({
      securityHealth: 'warning',
      solvencyStatus: 'Monitor Closely',
    });

    expect(calculateNetworkSecurityState(1.99)).toEqual({
      securityHealth: 'warning',
      solvencyStatus: 'Monitor Closely',
    });
  });

  it('marks ratios below 1.5x as at-risk', () => {
    expect(calculateNetworkSecurityState(1.49)).toEqual({
      securityHealth: 'at-risk',
      solvencyStatus: 'Undercapitalized',
    });

    expect(calculateNetworkSecurityState(0)).toEqual({
      securityHealth: 'at-risk',
      solvencyStatus: 'Undercapitalized',
    });
  });
});
