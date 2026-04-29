import { describe, expect, it } from 'vitest';
import { calculateNetworkSecurityState } from '../calculations';

describe('network security state', () => {
  it('marks ratios at or above 2.5x as healthy and well secured', () => {
    expect(calculateNetworkSecurityState(2.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Well Secured',
    });

    expect(calculateNetworkSecurityState(9.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Well Secured',
    });
  });

  it('marks ratios from 1.5x up to but not including 2.5x as healthy', () => {
    expect(calculateNetworkSecurityState(1.5)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Healthy',
    });

    expect(calculateNetworkSecurityState(2.49)).toEqual({
      securityHealth: 'healthy',
      solvencyStatus: 'Healthy',
    });
  });

  it('marks ratios from 1.0x up to but not including 1.5x as warning and building', () => {
    expect(calculateNetworkSecurityState(1.0)).toEqual({
      securityHealth: 'warning',
      solvencyStatus: 'Building',
    });

    expect(calculateNetworkSecurityState(1.49)).toEqual({
      securityHealth: 'warning',
      solvencyStatus: 'Building',
    });
  });

  it('marks ratios below 1.0x as at-risk', () => {
    expect(calculateNetworkSecurityState(0.99)).toEqual({
      securityHealth: 'at-risk',
      solvencyStatus: 'Undercapitalized',
    });

    expect(calculateNetworkSecurityState(0)).toEqual({
      securityHealth: 'at-risk',
      solvencyStatus: 'Undercapitalized',
    });
  });
});
