import { render, screen } from '@testing-library/react';
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
});
