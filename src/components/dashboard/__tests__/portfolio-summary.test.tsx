import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PortfolioSummary } from '../portfolio-summary';

describe('PortfolioSummary', () => {
  it('labels stale RUNE price data in the portfolio summary', () => {
    render(
      <PortfolioSummary
        totalBonded={100}
        runePrice={4.25}
        runePriceIsStale
        runePriceUpdatedAt={new Date('2024-01-01T00:00:00.000Z')}
        weightedAPY={12}
        feeImpactRUNE={2}
        feeImpactUSD={8.5}
        positions={[]}
      />
    );

    expect(screen.getByText('RUNE Price')).toBeInTheDocument();
    expect(screen.getByText('Stale price · updated 2024-01-01 00:00 UTC')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Total Bonded summary' })).toHaveTextContent('$425.00 USD · stale quote');
    expect(screen.getByRole('group', { name: 'Annual Earnings (Net) summary' })).toHaveTextContent('$51.00 · stale quote');
    expect(screen.getByRole('group', { name: 'Fee Impact summary' })).toHaveTextContent('-$8.50 · stale quote');
  });

  it('labels quote-derived portfolio summary values when RUNE quote freshness is unknown', () => {
    render(
      <PortfolioSummary
        totalBonded={100}
        runePrice={4.25}
        runePriceIsStale={false}
        runePriceUpdatedAt={null}
        weightedAPY={12}
        feeImpactRUNE={2}
        feeImpactUSD={8.5}
        positions={[]}
      />
    );

    expect(screen.getByRole('group', { name: 'RUNE Price summary' })).toHaveTextContent('Quote loaded without freshness');
    expect(screen.getByRole('group', { name: 'Total Bonded summary' })).toHaveTextContent('$425.00 USD · quote unverified');
    expect(screen.getByRole('group', { name: 'Annual Earnings (Net) summary' })).toHaveTextContent('$51.00 · quote unverified');
    expect(screen.getByRole('group', { name: 'Fee Impact summary' })).toHaveTextContent('-$8.50 · quote unverified');
  });

  it('opens provider exposure evidence without exposing a numeric score', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <PortfolioSummary
        totalBonded={0}
        runePrice={0}
        weightedAPY={0}
        positions={[]}
      />
    );

    const breakdownButton = screen.getByRole('button', {
      name: /provider exposure evidence/i,
    });

    expect(screen.getByRole('group', { name: 'Provider Exposure summary' })).toHaveTextContent('No bonded exposure');
    expect(screen.queryByText('A+')).not.toBeInTheDocument();
    expect(breakdownButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(breakdownButton);

    expect(breakdownButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Provider Exposure Evidence')).toBeInTheDocument();
    expect(screen.getByText('Review state: No bonded exposure')).toBeInTheDocument();
    expect(screen.getByText('No review deductions currently visible')).toBeInTheDocument();
    expect(screen.queryByText(/Baseline review allowance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Exposure score:/i)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/\b100 points\b/i);
    expect(container).not.toHaveTextContent(/\d+\/100/);
  });

  it('labels clean bonded provider exposure as informational no-urgent review', async () => {
    const user = userEvent.setup();

    render(
      <PortfolioSummary
        totalBonded={12_500}
        runePrice={1.5}
        weightedAPY={12}
        positions={[{
          nodeAddress: 'thor1summarynode0000000000000000000000000000',
          nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
          bondAmount: 12_500,
          bondSharePercent: 100,
          status: 'Active',
          operatorFee: 500,
          operatorFeeFormatted: '5.0%',
          netAPY: 12,
          totalBond: 12_500,
          slashPoints: 0,
          isJailed: false,
          jailReleaseHeight: 0,
          version: '3.19.0',
          requestedToLeave: false,
          yieldGuardFlags: [],
        }]}
      />
    );

    const providerExposureSummary = screen.getByRole('group', { name: 'Provider Exposure summary' });
    const reviewLabel = screen.getByText('No urgent review');
    const evidenceButton = screen.getByRole('button', {
      name: /provider exposure evidence/i,
    });

    expect(providerExposureSummary).toHaveTextContent('No urgent review');
    expect(providerExposureSummary).not.toHaveTextContent('No exposure issue visible');
    expect(reviewLabel).toHaveClass('text-sky-600');
    expect(reviewLabel).not.toHaveClass('text-emerald-600');

    await user.click(evidenceButton);

    expect(screen.getByText('Review state: No urgent review')).toBeInTheDocument();
  });

  it('shows unavailable headline metrics instead of NaN or Infinity', () => {
    const { container } = render(
      <PortfolioSummary
        totalBonded={Number.NaN}
        runePrice={Number.POSITIVE_INFINITY}
        weightedAPY={Number.NEGATIVE_INFINITY}
        feeImpactRUNE={Number.NaN}
        feeImpactUSD={Number.POSITIVE_INFINITY}
        positions={[]}
      />
    );

    expect(screen.getByRole('group', { name: 'Total Bonded summary' })).toHaveTextContent('--');
    expect(screen.getByRole('group', { name: 'Annual Earnings (Net) summary' })).toHaveTextContent('N/A');
    expect(screen.getByRole('group', { name: 'RUNE Price summary' })).toHaveTextContent('--');
    expect(screen.getByRole('group', { name: 'Weighted APY summary' })).toHaveTextContent('--');
    expect(screen.queryByText('Fee Impact')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it('formats RUNE quote update time deterministically for hydration safety', () => {
    render(
      <PortfolioSummary
        totalBonded={100}
        runePrice={4.25}
        runePriceIsStale={false}
        runePriceUpdatedAt={new Date('2024-06-12T09:30:00.000Z')}
        weightedAPY={12}
        positions={[]}
      />
    );

    expect(screen.getByRole('group', { name: 'RUNE Price summary' })).toHaveTextContent('Updated 2024-06-12 09:30 UTC');
  });
});
