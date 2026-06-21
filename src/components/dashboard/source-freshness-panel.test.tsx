import { render, screen } from '@/test/utils';
import { describe, expect, it } from 'vitest';
import { SourceFreshnessPanel } from './source-freshness-panel';
import type { SourceFreshness } from '@/lib/dashboard/insights';

const NOW = new Date('2026-06-12T12:00:00.000Z');

function sources(overrides: Partial<SourceFreshness>[] = []): SourceFreshness[] {
  return [
    {
      source: 'THORNode',
      status: 'fresh',
      lastSuccess: NOW,
      detail: 'Latest probe succeeded.',
      ...overrides[0],
    },
    {
      source: 'Midgard',
      status: 'fresh',
      lastSuccess: NOW,
      detail: 'Latest probe succeeded.',
      ...overrides[1],
    },
    {
      source: 'RUNE price',
      status: 'fresh',
      lastSuccess: NOW,
      detail: 'Price quote available for USD conversions.',
      ...overrides[2],
    },
  ];
}

describe('SourceFreshnessPanel', () => {
  it('renders a compact source-check summary for mobile triage', () => {
    render(<SourceFreshnessPanel sources={sources()} now={NOW} compact />);

    const summary = screen.getByLabelText('Source checks');
    expect(summary).toHaveAttribute('data-variant', 'compact');
    expect(summary).toHaveTextContent('Data source checks');
    expect(summary).not.toHaveTextContent('Live data confidence');
    expect(summary).not.toHaveTextContent('Data source confidence');
    expect(summary).toHaveTextContent('Checks responding');
    expect(summary).not.toHaveTextContent('No source issues');
    expect(summary).not.toHaveTextContent('All fresh');
    expect(summary).toHaveTextContent('THORNode');
    expect(summary).toHaveTextContent('Midgard');
    expect(summary).toHaveTextContent('RUNE price');
    expect(summary).toHaveTextContent('Responding');
    expect(summary).not.toHaveTextContent('Fresh');
    expect(summary).not.toHaveTextContent('Price quote available for USD conversions.');
  });

  it('keeps compact source status labels readable instead of truncating trust state text', () => {
    render(<SourceFreshnessPanel sources={sources()} now={NOW} compact />);

    for (const statusLabel of screen.getAllByText('Responding')) {
      expect(statusLabel).not.toHaveClass('truncate');
    }
  });

  it('keeps standard mobile source checks in one compact row before actions', () => {
    render(<SourceFreshnessPanel sources={sources()} now={NOW} compact />);

    const grid = screen.getByTestId('source-check-grid');
    expect(grid).toHaveClass('min-[360px]:grid-cols-3');
    expect(grid).not.toHaveClass('min-[360px]:grid-cols-2');
  });

  it('summarizes stale and degraded source states without relying on color alone', () => {
    render(
      <SourceFreshnessPanel
        sources={sources([
          {},
          { status: 'degraded', detail: 'Recent probe failed.' },
          { status: 'stale', detail: 'Price feed is stale.' },
        ])}
        now={NOW}
        compact
      />
    );

    const summary = screen.getByLabelText('Source checks');
    expect(summary).toHaveTextContent('1 degraded · 1 stale');
    expect(summary).toHaveTextContent('Degraded');
    expect(summary).toHaveTextContent('Stale');
  });

  it('does not imply source checks passed when no source checks were supplied', () => {
    render(<SourceFreshnessPanel sources={[]} now={NOW} compact />);

    const summary = screen.getByLabelText('Source checks');
    expect(summary).toHaveTextContent('No checks yet');
    expect(summary).not.toHaveTextContent('Checks responding');
    expect(summary).not.toHaveTextContent('No source issues');
  });

  it('allows transaction pages to give compact source checks a specific accessible name', () => {
    render(
      <SourceFreshnessPanel
        ariaLabel="Transaction source checks"
        id="transaction-source-confidence"
        sources={sources()}
        now={NOW}
        compact
        title="Transaction source checks"
      />
    );

    const summary = screen.getByLabelText('Transaction source checks');
    expect(summary).toHaveAttribute('id', 'transaction-source-confidence');
    expect(summary).toHaveTextContent('Transaction source checks');
    expect(summary).toHaveTextContent('Data source checks');
    expect(screen.queryByLabelText('Source confidence')).not.toBeInTheDocument();
  });

  it('labels local mock data as demo data instead of a live-source failure', () => {
    render(
      <SourceFreshnessPanel
        id="transaction-source-confidence"
        sources={[{
          source: 'THORNode',
          status: 'demo',
          lastSuccess: null,
          detail: 'Local mock data is enabled. Values are illustrative and are not live THORChain readings.',
        }]}
        now={NOW}
      />
    );

    const panel = screen.getByLabelText('Source freshness');
    expect(panel).toHaveAttribute('id', 'transaction-source-confidence');
    expect(panel).toHaveTextContent('Demo');
    expect(panel).toHaveTextContent('Mode: local fixture');
    expect(panel).toHaveTextContent('Local mock data is enabled');
    expect(panel).not.toHaveTextContent('Last success: No successful check yet');
  });

  it('describes full source freshness without implying every reading is live', () => {
    render(<SourceFreshnessPanel sources={sources()} now={NOW} />);

    const panel = screen.getByLabelText('Source freshness');
    expect(panel).toHaveTextContent('Freshness and availability checks for the readings on this screen.');
    expect(panel).not.toHaveTextContent('Confidence for the readings on this screen.');
    expect(panel).not.toHaveTextContent('Confidence for the live readings on this screen.');
  });
});
