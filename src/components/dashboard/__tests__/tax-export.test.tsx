import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TaxExport from '../tax-export';

const mockUseLpPositions = vi.fn();

vi.mock('@/lib/hooks/use-lp-positions', () => ({
  useLpPositions: (address: string | null) => mockUseLpPositions(address),
}));

const basePosition = {
  address: 'bc1member',
  pool: 'BTC.BTC',
  assetSymbol: 'BTC',
  runeDeposit: '5000000000',
  asset2Deposit: '250000000',
  liquidityUnits: '100',
  runeAdded: '100000000',
  runePending: '0',
  runeWithdrawn: '0',
  asset2Added: '10000000',
  asset2Pending: '0',
  asset2Withdrawn: '0',
  volume24h: '900000000',
  runeDepth: '250000000000',
  asset2Depth: '125000000000',
  dateFirstAdded: '1700000000',
  dateLastAdded: '1700500000',
  poolApy: 0.125,
  poolStatus: 'available' as const,
  ownershipPercent: 25,
  hasPending: false,
  runeDepositedValue: '5000000000',
  asset2DepositedValue: '250000000',
  runeWithdrawable: '5500000000',
  asset2Withdrawable: '275000000',
  currentRunePriceUsd: 0.48,
  currentAssetPriceUsd: 1.92,
  entryRunePriceUsd: 0.45,
  entryAssetPriceUsd: 1.8,
  currentTotalValueUsd: 31.68,
  depositedTotalValueUsd: 27,
  netProfitLoss: '+$4.68',
  netProfitLossUsd: 4.68,
  netProfitLossPercent: 17.33,
  hodlValueUsd: 31.5,
  impermanentLossUsd: 0.18,
  impermanentLossPercent: 0.57,
  impermanentLossValue: 0.18,
  pricingSource: 'historical' as const,
  runeEntryPrice: 0.45,
  asset2EntryPrice: 1.8,
};

describe('TaxExport', () => {
  beforeEach(() => {
    mockUseLpPositions.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disables LP CSV export while historical pricing enrichment is still loading', () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        ...basePosition,
        pricingSource: 'current-only',
        depositedTotalValueUsd: null,
        netProfitLossUsd: null,
        netProfitLossPercent: null,
        impermanentLossUsd: null,
        impermanentLossPercent: null,
      }],
      isLoading: false,
      isHistoricalEnrichmentLoading: true,
      error: undefined,
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tax-export');

    render(<TaxExport address="thor1lpaddress" />);

    expect(mockUseLpPositions).toHaveBeenCalledWith('thor1lpaddress');
    expect(screen.getByText(/Historical pricing is still enriching/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Enriching historical pricing/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(createObjectURL).not.toHaveBeenCalled();

    createObjectURL.mockRestore();
  });

  it('disables LP CSV export for estimated entry pricing instead of treating it as complete history', () => {
    mockUseLpPositions.mockReturnValue({
      positions: [{
        ...basePosition,
        pricingSource: 'estimated',
      }],
      isLoading: false,
      isHistoricalEnrichmentLoading: false,
      error: undefined,
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tax-export');

    render(<TaxExport address="thor1lpaddress" />);

    expect(screen.getByText(/Estimated\/current-only LP CSV export is disabled/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Historical pricing unavailable/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(createObjectURL).not.toHaveBeenCalled();

    createObjectURL.mockRestore();
  });

  it('shows an inline failure instead of blocking the dashboard when LP CSV generation fails', () => {
    mockUseLpPositions.mockReturnValue({
      positions: [basePosition],
      isLoading: false,
      isHistoricalEnrichmentLoading: false,
      error: undefined,
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('blob unavailable');
    });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<TaxExport address="thor1lpaddress" />);

    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    expect(alert).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'LP CSV export failed. No file was downloaded. Try again after source data is available.'
    );

    createObjectURL.mockRestore();
    alert.mockRestore();
    consoleError.mockRestore();
  });
});
