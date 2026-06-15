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
  it('renders a compact source-confidence summary for mobile triage', () => {
    render(<SourceFreshnessPanel sources={sources()} now={NOW} compact />);

    const summary = screen.getByLabelText('Source confidence');
    expect(summary).toHaveAttribute('data-variant', 'compact');
    expect(summary).toHaveTextContent('Data source confidence');
    expect(summary).not.toHaveTextContent('Live data confidence');
    expect(summary).toHaveTextContent('All fresh');
    expect(summary).toHaveTextContent('THORNode');
    expect(summary).toHaveTextContent('Midgard');
    expect(summary).toHaveTextContent('RUNE price');
    expect(summary).toHaveTextContent('Fresh');
    expect(summary).not.toHaveTextContent('Price quote available for USD conversions.');
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

    const summary = screen.getByLabelText('Source confidence');
    expect(summary).toHaveTextContent('2 degraded');
    expect(summary).toHaveTextContent('Degraded');
    expect(summary).toHaveTextContent('Stale');
  });

  it('describes full source confidence without implying every reading is live', () => {
    render(<SourceFreshnessPanel sources={sources()} now={NOW} />);

    const panel = screen.getByLabelText('Source freshness');
    expect(panel).toHaveTextContent('Confidence for the readings on this screen.');
    expect(panel).not.toHaveTextContent('Confidence for the live readings on this screen.');
  });
});
