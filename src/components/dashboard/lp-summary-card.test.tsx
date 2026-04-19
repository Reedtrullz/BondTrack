import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LpSummaryCard } from './lp-summary-card';

describe('LpSummaryCard', () => {
  it('renders formatted LP deposit values and truthful LP labels', () => {
    render(
      <LpSummaryCard
        position={{
          address: 'cosmos14cd9ezuklp8rj2f0k4k2lmryjzmv50mrgnl6we',
          pool: 'GAIA.ATOM',
          runeDeposit: '4313455076023',
          asset2Deposit: '1000000000000',
          liquidityUnits: '3901166248403',
          runeAdded: '4313455076023',
          runePending: '0',
          runeWithdrawn: '0',
          asset2Added: '0',
          asset2Pending: '0',
          asset2Withdrawn: '0',
          volume24h: '1763509510223',
          runeDepth: '32657324978656',
          asset2Depth: '2000000000000',
          dateFirstAdded: '1657861238',
          dateLastAdded: '1657861346',
          poolApy: 0,
          poolStatus: 'available',
          ownershipPercent: 31.25,
          hasPending: false,
          runeDepositedValue: '43134.55',
          asset2DepositedValue: '10000.00',
          runeWithdrawable: '43134.55',
          asset2Withdrawable: '10000.00',
          netProfitLoss: '0.00',
          netProfitLossPercent: 0,
        }}
      />
    );

expect(screen.getByText('RUNE Deposited')).toBeInTheDocument();
    expect(screen.getByText('Pool APY')).toBeInTheDocument();
    expect(screen.getByText('24H Volume')).toBeInTheDocument();
    expect(screen.getByText('Pool Depth')).toBeInTheDocument();
    expect(screen.getAllByText('43134.55')).toHaveLength(2);
    expect(screen.getByText('PnL Percentage')).toBeInTheDocument();
    expect(screen.getAllByText('0.00%')).toHaveLength(2);
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('17635.09')).toBeInTheDocument();
    expect(screen.getByText('326573.24')).toBeInTheDocument();
    expect(screen.queryByText('4313455076023')).not.toBeInTheDocument();
    expect(screen.queryByText('Health Score')).not.toBeInTheDocument();
    expect(screen.queryByText('Slash Risk')).not.toBeInTheDocument();
    expect(screen.queryByText('Unbond Window')).not.toBeInTheDocument();
  });

  it('highlights pending add state when pending rune exists', () => {
    render(
      <LpSummaryCard
        position={{
          address: 'thor1pending',
          pool: 'DOGE.DOGE',
          runeDeposit: '459587915856',
          asset2Deposit: '500000000000',
          liquidityUnits: '595497833150',
          runeAdded: '459587915856',
          runePending: '100000000',
          runeWithdrawn: '0',
          asset2Added: '0',
          asset2Pending: '0',
          asset2Withdrawn: '0',
          volume24h: '13411438936589',
          runeDepth: '234638705305798',
          asset2Depth: '1000000000000',
          dateFirstAdded: '1642447845',
          dateLastAdded: '1642447845',
          poolApy: 0,
          poolStatus: 'available',
          ownershipPercent: 2.25,
          hasPending: true,
          runeDepositedValue: '459.59',
          asset2DepositedValue: '500.00',
          runeWithdrawable: '459.59',
          asset2Withdrawable: '500.00',
          netProfitLoss: '0.00',
          netProfitLossPercent: 0,
        }}
      />
    );

    expect(screen.getByText('Pending Add')).toBeInTheDocument();
    expect(screen.getByText('1.00 + 0.00')).toBeInTheDocument();
  });
});
