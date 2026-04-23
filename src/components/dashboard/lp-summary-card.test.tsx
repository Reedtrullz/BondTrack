import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LpSummaryCard } from './lp-summary-card';

const basePosition = {
  address: 'cosmos14cd9ezuklp8rj2f0k4k2lmryjzmv50mrgnl6we',
  pool: 'GAIA.ATOM',
  assetSymbol: 'ATOM',
  runeDeposit: '4313455076023',
  asset2Deposit: '250000000',
  liquidityUnits: '3901166248403',
  runeAdded: '4313455076023',
  runePending: '0',
  runeWithdrawn: '0',
  asset2Added: '250000000',
  asset2Pending: '0',
  asset2Withdrawn: '0',
  volume24h: '1763509510223',
  runeDepth: '32657324978656',
  asset2Depth: '2000000000000',
  dateFirstAdded: '1657861238',
  dateLastAdded: '1657861346',
  poolApy: 7.5,
  poolStatus: 'available' as const,
  ownershipPercent: 31.25,
  hasPending: false,
  runeDepositedValue: '4313455076023',
  asset2DepositedValue: '250000000',
  runeWithdrawable: '7341195037498',
  asset2Withdrawable: '1930780800838',
  currentRunePriceUsd: 0.4885,
  currentAssetPriceUsd: 1.8644,
  entryRunePriceUsd: 0.49,
  entryAssetPriceUsd: 1.86,
  currentTotalValueUsd: 63577,
  depositedTotalValueUsd: 37056,
  netProfitLoss: '+$26521.00',
  netProfitLossUsd: 26521,
  netProfitLossPercent: 71.57,
  hodlValueUsd: 62100,
  impermanentLossUsd: 1477,
  impermanentLossPercent: 2.38,
  impermanentLossValue: 1477,
  pricingSource: 'historical' as const,
  runeEntryPrice: 0.49,
  asset2EntryPrice: 1.86,
};

describe('LpSummaryCard', () => {
  it('renders investor-facing labels without legacy protocol dump metrics', () => {
    render(<LpSummaryCard position={basePosition} />);

    expect(screen.getByText('ATOM Deposited')).toBeInTheDocument();
    expect(screen.getByText('Current Value')).toBeInTheDocument();
    expect(screen.getByText('Net P/L')).toBeInTheDocument();
    expect(screen.queryByText('24H Volume')).not.toBeInTheDocument();
    expect(screen.queryByText('Pool Depth')).not.toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText(/Ownership\s+31\.25%/)).toBeInTheDocument();
  });

  it('highlights pending add state and keeps degraded performance messaging honest', () => {
    render(
      <LpSummaryCard
        position={{
          ...basePosition,
          pool: 'DOGE.DOGE',
          assetSymbol: 'DOGE',
          hasPending: true,
          runePending: '100000000',
          netProfitLoss: 'Current value only',
          netProfitLossUsd: null,
          netProfitLossPercent: null,
          impermanentLossUsd: null,
          impermanentLossPercent: null,
          impermanentLossValue: null,
          entryRunePriceUsd: null,
          entryAssetPriceUsd: null,
          pricingSource: 'current-only',
          runeEntryPrice: null,
          asset2EntryPrice: null,
        }}
      />
    );

    expect(screen.getByText('Pending Add')).toBeInTheDocument();
    expect(screen.getByText('No history')).toBeInTheDocument();
  });
});
