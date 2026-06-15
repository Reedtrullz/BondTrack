import { render, screen, within } from '@testing-library/react';
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

    expect(screen.getByText(/Heimdall's Provider Exposure score/)).toBeInTheDocument();
    expect(screen.queryByText(/BondTrack/)).not.toBeInTheDocument();
  });

  it('renders article navigation links without nested buttons', async () => {
    const params = Promise.resolve({ slug: 'what-is-thorchain' });
    render(await ArticlePage({ params }));

    const backLink = screen.getByRole('link', { name: 'Back to Learn' });
    expect(backLink).toHaveAttribute('href', '/learn');
    expect(backLink.querySelector('button')).toBeNull();

    const relatedLink = screen.getAllByRole('link', { name: 'Bonding Basics' }).at(-1);
    expect(relatedLink).toHaveAttribute('href', '/learn/bonding-basics');
    expect(relatedLink?.querySelector('button')).toBeNull();
  });

  it('uses one article h1 and puts the provider decision before long-form sections', async () => {
    const params = Promise.resolve({ slug: 'health-score-guide' });
    render(await ArticlePage({ params }));

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    const decision = screen.getByLabelText('Learning article decision');
    const sections = screen.getByLabelText('Article sections');
    expect(decision).toHaveTextContent('Use this when a dashboard status needs explanation before action.');
    expect(within(decision).getByRole('link', { name: 'Open Risk dashboard' })).toHaveAttribute('href', '/dashboard/risk');
    expect(
      decision.compareDocumentPosition(sections) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders article bullets and ordered steps with semantic list containers', async () => {
    const params = Promise.resolve({ slug: 'bonding-basics' });
    render(await ArticlePage({ params }));

    const sections = screen.getByLabelText('Article sections');
    expect(within(sections).getByRole('heading', { name: 'How to Bond' })).toBeInTheDocument();
    expect(within(sections).getByRole('list', { name: 'How to Bond steps' })).toBeInTheDocument();
    expect(within(sections).getByRole('list', { name: 'Risks points' })).toBeInTheDocument();
    expect(within(sections).getByRole('listitem', { name: /Choose a Node/i })).toHaveTextContent('Node Explorer');
  });

  it('keeps source-sensitive learning copy from implying live certainty', async () => {
    const lpParams = Promise.resolve({ slug: 'lp-impermanent-loss' });
    render(await ArticlePage({ params: lpParams }));

    const sections = screen.getByLabelText('Article sections');
    expect(sections).toHaveTextContent('current price data');
    expect(sections).toHaveTextContent('inspect source-backed positions');
    expect(sections).not.toHaveTextContent('live price data');
    expect(sections).not.toHaveTextContent('inspect live positions');
  });

  it('treats confirmed bonds as active instead of live UI readings', async () => {
    const params = Promise.resolve({ slug: 'bonding-basics' });
    render(await ArticlePage({ params }));

    const sections = screen.getByLabelText('Article sections');
    expect(sections).toHaveTextContent('before treating the position as active');
    expect(sections).not.toHaveTextContent('before treating the position as live');
  });
});
