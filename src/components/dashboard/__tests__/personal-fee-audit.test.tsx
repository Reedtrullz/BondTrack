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
    earningsDaily: 0.3,
    earningsMonthly: 9,
    earningsYearly: 109.5,
  },
  {
    nodeAddress: 'node2',
    nodeOperatorAddress: 'op2',
    bondAmount: 20000,
    operatorFee: 0.02,
    operatorFeeFormatted: '2%',
    status: 'Active',
    slashPoints: 0,
    isJailed: false,
    yieldGuardFlags: [],
    totalBond: 200000,
    netAPY: 0.11,
    earningsDaily: 0.6,
    earningsMonthly: 18,
    earningsYearly: 219,
  },
];

describe('PersonalFeeAudit', () => {
  it('calculates and displays correct total fee leakage for multiple positions', () => {
    render(<PersonalFeeAudit positions={mockPositions} />);
    
    // Expected Leakage: (10000 * 0.000001 * 30 * 0.01) + (20000 * 0.000001 * 30 * 0.02) 
    // = 0.003 + 0.012 = 0.015
    expect(screen.getByText(/0.0150/)).toBeInTheDocument();
    expect(screen.getByText(/Fee Leakage/i)).toBeInTheDocument();
  });

  it('handles zero positions gracefully', () => {
    render(<PersonalFeeAudit positions={[]} />);
    expect(screen.getByText(/No positions found/i)).toBeInTheDocument();
  });

  it('formats RUNE amounts correctly', () => {
    render(<PersonalFeeAudit positions={mockPositions} />);
    expect(screen.getByText(/RUNE/i)).toBeInTheDocument();
  });
});
