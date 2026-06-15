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

    expect(screen.getByText('No urgent action')).toBeInTheDocument();
    expect(screen.getByText('Current sources do not show a critical node, source, or LP confidence issue.')).toBeInTheDocument();
    expect(screen.queryByText('Live data does not show a critical node, source, or LP confidence issue.')).not.toBeInTheDocument();
  });

  it('keeps command-center actions scannable at the mobile compact breakpoint', () => {
    render(<ActionQueue items={actions} now={now} mobileCompact />);

    expect(screen.getByText('Ranked by operator impact.')).toHaveClass('sm:hidden');
    expect(screen.getByText('Ranked by operator impact, not by visual noise.')).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByText(actions[0].detail)).toHaveClass('hidden', 'sm:block');
    expect(screen.getByText(`Impact: ${actions[0].impact}`)).toHaveClass('hidden', 'sm:block');

    const action = screen.getByRole('link', { name: 'Review churn risk' });
    expect(action).toHaveAttribute('href', '/dashboard/risk?address=thor1bond&node=thor1node');
    expect(action).toHaveClass('h-8', 'sm:h-9');
  });

  it('keeps the default action cards fully explanatory', () => {
    render(<ActionQueue items={actions} now={now} />);

    expect(screen.getByText(actions[0].detail)).not.toHaveClass('hidden');
    expect(screen.getByText(`Impact: ${actions[0].impact}`)).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: 'Review churn risk' })).toHaveClass('h-9');
  });

  it('keeps source-confidence consequences visible in compact mobile actions', () => {
    const sourceAction: ActionItem = {
      id: 'source:midgard:degraded',
      severity: 'warning',
      source: 'Midgard',
      title: 'Midgard is degraded',
      detail: 'Recent probe failed; using last successful data where available.',
      impact: 'Do not use reward history, LP performance, or transaction history for final decisions until Midgard recovers.',
      href: '/dashboard?address=thor1bond#source-confidence',
      lastSeen: now,
      primaryAction: 'Review source confidence',
    };

    render(<ActionQueue items={[sourceAction]} now={now} mobileCompact />);

    const impact = screen.getByText(`Impact: ${sourceAction.impact}`);
    expect(impact).not.toHaveClass('hidden');
    expect(impact).toHaveClass('text-xs');
    expect(screen.getByRole('link', { name: 'Review source confidence' })).toHaveAttribute(
      'href',
      '/dashboard?address=thor1bond#source-confidence'
    );
  });
});
