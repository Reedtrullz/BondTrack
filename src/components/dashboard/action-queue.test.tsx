import { render, screen } from '@/test/utils';
import { describe, expect, it } from 'vitest';
import { ActionQueue } from './action-queue';
import type { ActionItem } from '@/lib/dashboard/insights';

const now = new Date('2026-06-12T12:00:00.000Z');

const actions: ActionItem[] = [
  {
    id: 'churn:thor1node',
    severity: 'warning',
    source: 'Churn',
    title: 'thor1node is near churn risk',
    detail: 'This node is one of the lowest-bonded positions in the active set.',
    impact: 'A low bond rank can reduce earning continuity during churn events.',
    href: '/dashboard/risk?address=thor1bond&node=thor1node',
    lastSeen: now,
    primaryAction: 'Review churn risk',
  },
  {
    id: 'status:thor1standby',
    severity: 'info',
    source: 'Status',
    title: 'thor1standby is Standby',
    detail: 'This position is not in active validator status.',
    impact: 'Non-active nodes may not earn active-set rewards.',
    href: '/dashboard/nodes?address=thor1bond&node=thor1standby',
    lastSeen: now,
    primaryAction: 'Inspect node',
  },
];

describe('ActionQueue', () => {
  it('uses source-scoped language when no urgent action is visible', () => {
    render(<ActionQueue items={[]} now={now} />);

    const detail = screen.getByText(
      'Current source responses do not show a node, source, or LP issue that needs provider review.'
    );
    const emptyState = detail.parentElement;

    expect(screen.getByText('No urgent provider review visible')).toBeInTheDocument();
    expect(detail).toBeInTheDocument();
    expect(emptyState).toHaveClass('text-sky-800');
    expect(detail).toHaveClass('text-sky-700');
    expect(emptyState).not.toHaveClass('text-emerald-800');
    expect(screen.queryByText('No provider review needed')).not.toBeInTheDocument();
    expect(screen.queryByText('Current sources do not show a node, source, or LP check issue that needs provider review.')).not.toBeInTheDocument();
    expect(screen.queryByText('Current sources do not show a node, source, or LP confidence issue that needs provider review.')).not.toBeInTheDocument();
    expect(screen.queryByText('Live data does not show a critical node, source, or LP confidence issue.')).not.toBeInTheDocument();
  });

  it('can render an informational empty state without green all-clear styling', () => {
    render(
      <ActionQueue
        items={[]}
        now={now}
        emptyTone="info"
        emptyTitle="Demo data only"
        emptyDetail="Local fixtures can show the interface, but they cannot prove this provider has no live issues."
      />
    );

    const title = screen.getByText('Demo data only');
    const detail = screen.getByText('Local fixtures can show the interface, but they cannot prove this provider has no live issues.');
    const emptyState = detail.parentElement;
    expect(title).toBeInTheDocument();
    expect(emptyState).toHaveClass('text-sky-800');
    expect(detail).toHaveClass('text-sky-700');
    expect(emptyState).not.toHaveClass('text-emerald-800');
  });

  it('keeps command-center actions scannable at the mobile compact breakpoint', () => {
    render(<ActionQueue items={actions} now={now} mobileCompact />);
    const queue = screen.getByRole('region', { name: 'Provider review queue' });

    expect(queue).toHaveTextContent('Ranked by provider exposure, not by visual noise.');
    expect(queue).not.toHaveTextContent('Ranked by provider exposure.Ranked by provider exposure, not by visual noise.');
    expect(screen.getByText(actions[0].title)).not.toHaveClass('truncate');
    expect(screen.getByText(actions[0].title)).toHaveClass('whitespace-normal');
    expect(screen.getByText(actions[0].detail)).not.toHaveClass('hidden');
    expect(screen.getByText(actions[0].detail)).toHaveClass('line-clamp-2', 'sm:line-clamp-none');
    const impact = screen.getByText(`Provider impact: ${actions[0].impact}`);
    expect(impact).not.toHaveClass('hidden');
    expect(impact).toHaveClass('line-clamp-1', 'sm:line-clamp-none');
    expect(queue).not.toHaveTextContent(`Impact: Earning continuity riskProvider impact: ${actions[0].impact}`);

    const action = screen.getByRole('link', { name: 'Review churn risk' });
    expect(action).toHaveAttribute('href', '/dashboard/risk?address=thor1bond&node=thor1node');
    expect(action).toHaveClass('h-8', 'sm:h-9');
    expect(screen.queryByText('Review risk')).not.toBeInTheDocument();
    expect(queue).not.toHaveTextContent('Review riskReview churn risk');
    expect(screen.getByText('Inspect node')).toBeInTheDocument();
  });

  it('keeps the default action cards fully explanatory', () => {
    render(<ActionQueue items={actions} now={now} />);

    expect(screen.getByText(actions[0].detail)).not.toHaveClass('hidden');
    expect(screen.getByText(`Provider impact: ${actions[0].impact}`)).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: 'Review churn risk' })).toHaveClass('h-9');
  });

  it('keeps source-check consequences visible in compact mobile actions', () => {
    const sourceAction: ActionItem = {
      id: 'source:midgard:degraded',
      severity: 'warning',
      source: 'Midgard',
      title: 'Midgard is degraded',
      detail: 'Recent probe failed; using last successful data where available.',
      impact: 'Do not use reward history, LP performance, or transaction history for final decisions until Midgard recovers.',
      href: '/dashboard?address=thor1bond#source-confidence',
      lastSeen: now,
      primaryAction: 'Review source checks',
    };

    render(<ActionQueue items={[sourceAction]} now={now} mobileCompact />);

    const impact = screen.getByText(`Provider impact: ${sourceAction.impact}`);
    expect(impact).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: 'Review source checks' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1bond#source-confidence'
    );
    expect(screen.queryByText('Review source')).not.toBeInTheDocument();
  });
});
