import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InsightHeader } from './insight-header';

const defaultProps = {
  severity: 'warning' as const,
  statusLabel: 'Review Needed',
  diagnosis: 'Review the highest-confidence action before adding more capital.',
  topRisk: 'Operator fee leakage needs review',
  metrics: [
    { label: 'Weighted APY', value: '3.2%', detail: 'After operator fees' },
    { label: 'Bonded', value: '100 RUNE', detail: '1 node' },
    { label: 'Source', value: 'Fresh', detail: 'THORNode confirmed' },
  ],
  eyebrow: 'Portfolio',
};

describe('InsightHeader', () => {
  it('renders the diagnosis as the primary heading by default', () => {
    render(
      <InsightHeader
        {...defaultProps}
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Operator fee leakage needs review' })).toBeInTheDocument();
  });

  it('can render the diagnosis below an existing page title', () => {
    render(
      <InsightHeader
        {...defaultProps}
        headingLevel={2}
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    expect(screen.queryByRole('heading', { level: 1, name: 'Operator fee leakage needs review' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Operator fee leakage needs review' })).toBeInTheDocument();
  });

  it('renders navigational primary actions as links, not nested buttons', () => {
    render(
      <InsightHeader
        {...defaultProps}
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    const action = screen.getByRole('link', { name: 'Inspect Risk' });

    expect(action).toHaveAttribute('href', '/dashboard/risk?address=thor1abc');
    expect(screen.queryByRole('button', { name: 'Inspect Risk' })).not.toBeInTheDocument();
  });

  it('presents no-urgent review as informational, not success-confirmed', () => {
    render(
      <InsightHeader
        severity="healthy"
        statusLabel="No urgent review"
        diagnosis="Current source responses do not show an urgent provider action."
        topRisk="No urgent review visible"
        metrics={[
          {
            label: 'Provider exposure',
            value: 'No urgent',
            detail: 'No urgent action visible',
          },
          { label: 'Bonded', value: '100 RUNE', detail: '1 node' },
          { label: 'Net APY', value: '1.2%', detail: 'Weighted by bond' },
        ]}
        eyebrow="Node"
        primaryAction={{ label: 'Inspect details', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    const diagnosis = screen.getByLabelText('Node diagnosis');
    const badge = screen.getByText('No urgent review', { exact: true }).closest('span');
    const exposureMetric = screen.getByText('No urgent', { exact: true });
    const action = screen.getByRole('link', { name: 'Inspect details' });

    expect(diagnosis).toHaveClass('border-sky-200/70');
    expect(diagnosis).not.toHaveClass('border-emerald-200/70');
    expect(badge).toHaveClass('bg-sky-100');
    expect(badge).not.toHaveClass('bg-emerald-100');
    expect(exposureMetric).toHaveClass('text-sky-600');
    expect(exposureMetric).not.toHaveClass('text-emerald-600');
    expect(action).toHaveClass('hover:bg-zinc-100');
    expect(action).not.toHaveClass('border-zinc-200');
    expect(action).not.toHaveClass('bg-emerald-600/90');
  });

  it('renders state-changing primary actions as buttons', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <InsightHeader
        {...defaultProps}
        primaryAction={{ label: 'Show Details', href: '#details', onClick }}
      />
    );

    const action = screen.getByRole('button', { name: 'Show Details' });

    expect(screen.queryByRole('link', { name: 'Show Details' })).not.toBeInTheDocument();
    await user.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('can hide secondary metric detail at the mobile compact breakpoint', () => {
    render(
      <InsightHeader
        {...defaultProps}
        compactMobileMetrics
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    expect(screen.getByText('After operator fees')).toHaveClass('hidden');
    expect(screen.getByText('After operator fees')).toHaveClass('sm:block');
  });

  it('can keep compact metric detail visible when the detail carries decision confidence', () => {
    render(
      <InsightHeader
        {...defaultProps}
        compactMobileMetrics
        compactMetricDetailMode="all"
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    const detail = screen.getByText('After operator fees');

    expect(detail).not.toHaveClass('hidden');
    expect(detail).not.toHaveClass('sm:block');
  });

  it('uses compact metric values on mobile without dropping precise desktop values', () => {
    render(
      <InsightHeader
        {...defaultProps}
        compactMobileMetrics
        metrics={[
          { label: 'Bonded', value: 'ᚱ152,412.77', compactValue: 'ᚱ152.4K', detail: '3 nodes' },
          ...defaultProps.metrics.slice(1),
        ]}
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    expect(screen.getByText('ᚱ152.4K')).toHaveClass('sm:hidden');
    expect(screen.getByText('ᚱ152,412.77')).toHaveClass('hidden', 'sm:inline');
  });

  it('can use two mobile metric columns when compact values would wrap poorly', () => {
    render(
      <InsightHeader
        {...defaultProps}
        compactMobileMetrics
        mobileMetricColumns={2}
        primaryAction={{ label: 'Inspect Risk', href: '/dashboard/risk?address=thor1abc' }}
      />
    );

    const metricGrid = screen.getByText('Weighted APY').closest('.grid');
    expect(metricGrid).toHaveClass('grid-cols-2');
    expect(metricGrid).not.toHaveClass('grid-cols-3');
  });
});
