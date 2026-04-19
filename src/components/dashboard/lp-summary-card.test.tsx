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
          liquidityUnits: '3901166248403',
          runeAdded: '4313455076023',
          runePending: '0',
          runeWithdrawn: '0',
          volume24h: '1763509510223',
          runeDepth: '32657324978656',
          dateFirstAdded: '1657861238',
          dateLastAdded: '1657861346',
          poolApy: 0,
          poolStatus: 'available',
          ownershipPercent: 31.25,
          hasPending: false,
        }}
      />
    );

    expect(screen.getByText('RUNE Deposit Value')).toBeInTheDocument();
    expect(screen.getByText('Pool APY')).toBeInTheDocument();
    expect(screen.getByText('24H Volume')).toBeInTheDocument();
    expect(screen.getByText('Pool Depth')).toBeInTheDocument();
    expect(screen.getByText(/Ownership 31.25% · LP Units 3,901,166,248,403/i)).toBeInTheDocument();
    expect(screen.getAllByText('43134.55')).toHaveLength(2);
    expect(screen.getByText('0.00%')).toBeInTheDocument();
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
          liquidityUnits: '595497833150',
          runeAdded: '459587915856',
          runePending: '100000000',
          runeWithdrawn: '0',
          volume24h: '13411438936589',
          runeDepth: '234638705305798',
          dateFirstAdded: '1642447845',
          dateLastAdded: '1642447845',
          poolApy: 0,
          poolStatus: 'available',
          ownershipPercent: 2.25,
          hasPending: true,
        }}
      />
    );

    expect(screen.getByText('Pending Add')).toBeInTheDocument();
    expect(screen.getByText('1.00')).toBeInTheDocument();
  });
});
