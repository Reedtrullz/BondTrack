import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LpNodeRow } from './lp-node-row';

const basePosition = {
  address: 'cosmos1memberaddress',
  pool: 'GAIA.ATOM',
  assetSymbol: 'ATOM',
  runeDeposit: '5000000000',
  asset2Deposit: '250000000',
  liquidityUnits: '2500',
  runeAdded: '6000000000',
  runePending: '100000000',
  runeWithdrawn: '500000000',
  asset2Added: '250000000',
  asset2Pending: '0',
  asset2Withdrawn: '0',
  volume24h: '900000000',
  runeDepth: '250000000000',
  asset2Depth: '500000000000',
  dateFirstAdded: '1700000000',
  dateLastAdded: '1700500000',
  poolApy: 7.5,
  poolStatus: 'staged' as const,
  ownershipPercent: 25,
  hasPending: true,
  runeDepositedValue: '5000000000',
  asset2DepositedValue: '250000000',
  runeWithdrawable: '5500000000',
  asset2Withdrawable: '275000000',
  currentRunePriceUsd: 0.48,
  currentAssetPriceUsd: 1.8644,
  entryRunePriceUsd: null,
  entryAssetPriceUsd: null,
  currentTotalValueUsd: 31.68,
  depositedTotalValueUsd: null,
  netProfitLoss: 'Current value only',
  netProfitLossUsd: null,
  netProfitLossPercent: null,
  hodlValueUsd: null,
  impermanentLossUsd: null,
  impermanentLossPercent: null,
  impermanentLossValue: null,
  pricingSource: 'current-only' as const,
  runeEntryPrice: null,
  asset2EntryPrice: null,
};

describe('LpNodeRow', () => {
  it('renders investor-facing asset labels and truthful degraded performance copy', () => {
    render(
      <table>
        <tbody>
          <LpNodeRow position={{ ...basePosition, netProfitLossUsd: null, pricingSource: 'current-only' }} />
        </tbody>
      </table>
    );

    expect(screen.getByText('GAIA.ATOM')).toBeInTheDocument();
    expect(screen.getByText('RUNE: 50.00')).toBeInTheDocument();
    expect(screen.getByText('ATOM: 2.50')).toBeInTheDocument();
    expect(screen.getByText('No history')).toBeInTheDocument();
    expect(screen.queryByText('ASSET: 2.50')).not.toBeInTheDocument();
    expect(screen.getByText('Pending add')).toBeInTheDocument();
    expect(screen.getByText('Staged')).toBeInTheDocument();
  });
});
