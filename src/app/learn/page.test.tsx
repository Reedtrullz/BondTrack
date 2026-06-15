import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LearnPage from './page';

describe('LearnPage', () => {
  it('frames learning as an operator playbook with a clear first read', () => {
    render(<LearnPage />);

    expect(screen.getByRole('heading', { name: 'Operator playbook' })).toBeInTheDocument();

    const triage = screen.getByLabelText('Learning triage');
    expect(triage).toHaveTextContent('Start with health scoring');
    expect(within(triage).getByRole('link', { name: /Open Health Score Guide/i })).toHaveAttribute(
      'href',
      '/learn/health-score-guide'
    );
    expect(triage).toHaveTextContent('Use this when a dashboard status needs explanation before action.');
  });

  it('keeps article cards action-oriented and removes future-content filler', () => {
    render(<LearnPage />);

    const articleList = screen.getByLabelText('Operational guides');
    expect(within(articleList).getByRole('link', { name: /Bonding Basics/i })).toHaveTextContent('Use when');
    expect(within(articleList).getByRole('link', { name: /LP & Impermanent Loss/i })).toHaveTextContent('Relevant dashboard');
    expect(screen.queryByText(/More articles coming soon/i)).not.toBeInTheDocument();
  });

  it('links learning to the dashboard actions operators inspect next', () => {
    render(<LearnPage />);

    const actions = screen.getByLabelText('Dashboard actions after learning');
    expect(within(actions).getByRole('link', { name: 'Open command center' })).toHaveAttribute('href', '/dashboard');
    expect(within(actions).getByRole('link', { name: 'Review node risk' })).toHaveAttribute('href', '/dashboard/risk');
    expect(within(actions).getByRole('link', { name: 'Prepare transaction' })).toHaveAttribute('href', '/dashboard/transactions');
  });
});
