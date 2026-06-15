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
        positions={[]}
      />
    );

    expect(screen.getByText('RUNE Price')).toBeInTheDocument();
    expect(screen.getByText(/Stale price/)).toBeInTheDocument();
  });

  it('opens portfolio health breakdown through an accessible control', async () => {
    const user = userEvent.setup();

    render(
      <PortfolioSummary
        totalBonded={0}
        runePrice={0}
        weightedAPY={0}
        positions={[]}
      />
    );

    const breakdownButton = screen.getByRole('button', {
      name: /portfolio health score breakdown/i,
    });

    expect(breakdownButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(breakdownButton);

    expect(breakdownButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Health Score Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Final score: 100/100')).toBeInTheDocument();
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
});
