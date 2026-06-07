import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ArticlePage from './page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not found');
  }),
}));

describe('learn article renderer', () => {
  it('renders markdown links as accessible links instead of plain bracket text', async () => {
    const params = Promise.resolve({ slug: 'what-is-thorchain' });
    render(await ArticlePage({ params }));

    expect(screen.getAllByRole('link', { name: 'Bonding Basics' })[0]).toHaveAttribute('href', '/learn/bonding-basics');
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/dashboard/portfolio');
    expect(screen.queryByText(/\[Bonding Basics\]/)).not.toBeInTheDocument();
  });

  it('keeps Learn article branding on Heimdall', async () => {
    const params = Promise.resolve({ slug: 'health-score-guide' });
    render(await ArticlePage({ params }));

    expect(screen.getByText(/Heimdall's Health Score/)).toBeInTheDocument();
    expect(screen.queryByText(/BondTrack/)).not.toBeInTheDocument();
  });
});
