import { describe, it, expect } from 'vitest';
import { calculateNetworkSecurityState } from '../calculations';

describe('calculateNetworkSecurityState', () => {
  it('marks ratios at or above 2.0x as healthy and economically secure', () => {
    const result = calculateNetworkSecurityState(2.3);

    expect(result.securityHealth).toBe('healthy');
    expect(result.solvencyStatus).toBe('Economically Secure');
  });

  it('marks ratios between 1.5x and 2.0x as warning and monitor closely', () => {
    const result = calculateNetworkSecurityState(1.7);

    expect(result.securityHealth).toBe('warning');
    expect(result.solvencyStatus).toBe('Monitor Closely');
  });

  it('marks ratios below 1.5x as at-risk and undercapitalized', () => {
    const result = calculateNetworkSecurityState(1.2);

    expect(result.securityHealth).toBe('at-risk');
    expect(result.solvencyStatus).toBe('Undercapitalized');
  });
});
