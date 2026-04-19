import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LpNodeRow } from './lp-node-row';

describe('LpNodeRow', () => {
  it('renders formatted LP table values without dead health or details controls', () => {
    render(
      <table>
        <tbody>
          <LpNodeRow
            position={{
              address: 'bc1memberaddress',
              pool: 'BTC.BTC',
              runeDeposit: '5000000000',
              asset2Deposit: '250000000',
              liquidityUnits: '2500',
              runeAdded: '6000000000',
              runePending: '100000000',
              runeWithdrawn: '500000000',
              asset2Added: '0',
              asset2Pending: '0',
              asset2Withdrawn: '0',
              volume24h: '900000000',
              runeDepth: '250000000000',
              asset2Depth: '500000000000',
              dateFirstAdded: '1700000000',
              dateLastAdded: '1700500000',
              poolApy: 0,
              poolStatus: 'staged',
              ownershipPercent: 25,
              hasPending: true,
              runeDepositedValue: '50.00',
              asset2DepositedValue: '0.25',
              runeWithdrawable: '50.00',
              asset2Withdrawable: '0.25',
              netProfitLoss: '0.00',
              netProfitLossPercent: 0,
            }}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('BTC.BTC')).toBeInTheDocument();
    expect(screen.getByText('RUNE: 50.00')).toBeInTheDocument();
    expect(screen.getByText('ASSET: 2.50')).toBeInTheDocument();
    expect(screen.getByText('25.00%')).toBeInTheDocument();
    expect(screen.getByText('2,500 units')).toBeInTheDocument();
    expect(screen.getAllByText('0.00%')).toHaveLength(2);
    expect(screen.getByText('Staged')).toBeInTheDocument();
    expect(screen.getByText('APY')).toBeInTheDocument();
    expect(screen.getByText('Pending add')).toBeInTheDocument();
    expect(screen.queryByText('5000000000')).not.toBeInTheDocument();
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });
});
