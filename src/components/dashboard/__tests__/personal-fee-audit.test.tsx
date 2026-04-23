import { render, screen } from '@testing-library/react';
import { PersonalFeeAudit } from '../fee-impact-tracker';
import { describe, it, expect } from 'vitest';
import { BondPosition } from '@/lib/types/node';

const mockPositions: BondPosition[] = [
  {
    nodeAddress: 'node1',
    nodeOperatorAddress: 'op1',
    bondAmount: 10000,
    bondSharePercent: 0.1,
    operatorFee: 0.01,
    operatorFeeFormatted: '1%',
    status: 'Active',
    slashPoints: 0,
    isJailed: false,
    yieldGuardFlags: [],
    totalBond: 100000,
    netAPY: 0.12,
    jailReleaseHeight: 0,
    version: '',
    requestedToLeave: false
  },
  {
    nodeAddress: 'node2',
    nodeOperatorAddress: 'op2',
    bondAmount: 20000,
    bondSharePercent: 0.2,
    operatorFee: 0.02,
    operatorFeeFormatted: '2%',
    status: 'Active',
    slashPoints: 0,
    isJailed: false,
    yieldGuardFlags: [],
    totalBond: 200000,
    netAPY: 0.11,
    jailReleaseHeight: 0,
    version: '',
    requestedToLeave: false
  }
];

describe('PersonalFeeAudit', () => {
  it('calculates and displays correct total fee leakage for multiple positions', () => {
    render(<PersonalFeeAudit positions={mockPositions} />);
    
    // Expected Leakage: (10000 * 0.000001 * 30 * 0.01) + (20000 * 0.000001 * 30 * 0.02) 
    // = 0.003 + 0.012 = 0.015
    expect(screen.getByText(/-0.00 RUNE/i)).toBeDefined();
    expect(screen.getByText((content, element) => content === 'Leakage' && element.tagName === 'SPAN' && element.parentElement?.className.includes('bg-red-50'))).toBeDefined();
  });

  it('handles zero positions gracefully', () => {
    render(<PersonalFeeAudit positions={[]} />);
    expect(screen.getByText(/No bond positions found/i)).toBeDefined();
  });

  it('formats RUNE amounts correctly', () => {
    render(<PersonalFeeAudit positions={mockPositions} />);
    expect(screen.getAllByText(/RUNE/i)).toHaveLength(3);
  });
});
