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
              liquidityUnits: '2500',
              runeAdded: '6000000000',
              runePending: '100000000',
              runeWithdrawn: '500000000',
              volume24h: '900000000',
              runeDepth: '250000000000',
              dateFirstAdded: '1700000000',
              dateLastAdded: '1700500000',
              poolApy: 0,
              poolStatus: 'staged',
              ownershipPercent: 25,
              hasPending: true,
            }}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('BTC.BTC')).toBeInTheDocument();
    expect(screen.getByText('50.00')).toBeInTheDocument();
    expect(screen.getByText('0.00%')).toBeInTheDocument();
    expect(screen.getByText('Staged')).toBeInTheDocument();
    expect(screen.getByText('25.00%')).toBeInTheDocument();
    expect(screen.getByText('2,500 units')).toBeInTheDocument();
    expect(screen.getByText('9.00')).toBeInTheDocument();
    expect(screen.getByText('Pending add')).toBeInTheDocument();
    expect(screen.queryByText('5000000000')).not.toBeInTheDocument();
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });
});
