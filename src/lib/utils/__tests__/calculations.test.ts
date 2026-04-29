import { describe, it, expect } from 'vitest';
import { calculateNetworkSecurityState } from '../calculations';

describe('calculateNetworkSecurityState', () => {
  it('marks ratios at or above 2.5x as healthy and well secured', () => {
    const result = calculateNetworkSecurityState(2.5);

    expect(result.securityHealth).toBe('healthy');
    expect(result.solvencyStatus).toBe('Well Secured');
  });

  it('marks ratios between 1.5x and 2.5x as healthy', () => {
    const result = calculateNetworkSecurityState(1.7);

    expect(result.securityHealth).toBe('healthy');
    expect(result.solvencyStatus).toBe('Healthy');
  });

  it('marks ratios between 1.0x and 1.5x as warning and building', () => {
    const result = calculateNetworkSecurityState(1.2);

    expect(result.securityHealth).toBe('warning');
    expect(result.solvencyStatus).toBe('Building');
  });

  it('marks ratios below 1.0x as at-risk and undercapitalized', () => {
    const result = calculateNetworkSecurityState(0.8);

    expect(result.securityHealth).toBe('at-risk');
    expect(result.solvencyStatus).toBe('Undercapitalized');
  });
});
