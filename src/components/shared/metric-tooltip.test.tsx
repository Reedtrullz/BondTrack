import { fireEvent, render, screen } from '@/test/utils';
import { describe, expect, it } from 'vitest';
import { METRIC_EXPLANATIONS, MetricTooltip } from './metric-tooltip';

describe('MetricTooltip', () => {
  it('does not describe the RUNE price quote as updating live', () => {
    render(<MetricTooltip label="RUNE price" explanation={METRIC_EXPLANATIONS.runePrice} />);

    fireEvent.click(screen.getByRole('button', { name: 'Explain RUNE price' }));

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Updates when the price source refreshes.');
    expect(tooltip).not.toHaveTextContent('Updates live');
  });

  it('describes yield guard flags as source-check signals instead of backed risk certainty', () => {
    render(<MetricTooltip label="Yield guard" explanation={METRIC_EXPLANATIONS.yieldGuard} />);

    fireEvent.click(screen.getByRole('button', { name: 'Explain Yield guard' }));

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Flags from current source checks');
    expect(tooltip).toHaveTextContent('Review source freshness before acting');
    expect(tooltip).not.toHaveTextContent('current-source-backed risks');
  });
});
