
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChangelogsPage from './page';

const sampleChangelogs = [
  {
    id: 'mar-2026',
    title: 'March 2026 update',
    date: 'Mar 2026',
    fullDate: 'March 2026',
    sortDate: '2026-03',
    content: [
      {
        type: 'bug' as const,
        title: 'Fix shipped',
        description: 'A critical node operator fix shipped.',
      },
      {
        type: 'feature' as const,
        title: 'LP reporting improved',
        description: 'Liquidity provider accounting now highlights pool exposure.',
      },
    ],
  },
];

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.current.get(key),
    toString: () => mocks.searchParams.current.toString(),
  }),
}));

vi.mock('@/lib/hooks/use-changelogs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/hooks/use-changelogs')>('@/lib/hooks/use-changelogs');

  return {
    ...actual,
    useChangelogs: () => ({ changelogs: sampleChangelogs, isLoading: false }),
  };
});

describe('ChangelogsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.replace.mockClear();
    mocks.searchParams.current = new URLSearchParams();
  });

  it('resyncs state from URL changes and keeps the URL in sync with edits', async () => {
    const { rerender } = render(<ChangelogsPage />);

    expect((screen.getByPlaceholderText('Search changelogs... (press /)') as HTMLInputElement).value).toBe('');

    mocks.searchParams.current = new URLSearchParams('q=solana&type=bug');
    rerender(<ChangelogsPage />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Search changelogs... (press /)') as HTMLInputElement).value).toBe('solana');
    });

    const bugButton = screen.getByRole('button', { name: /bug/i });
    expect(bugButton.style.backgroundColor).toBe('rgb(0, 204, 255)');

    fireEvent.change(screen.getByPlaceholderText('Search changelogs... (press /)'), {
      target: { value: 'v3.16.2' },
    });

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenLastCalledWith('?q=v3.16.2&type=bug', { scroll: false });
    });
  });

  it('updates the selected filter in the URL when a filter button is clicked', async () => {
    render(<ChangelogsPage />);

    fireEvent.click(screen.getByRole('button', { name: /bug/i }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenLastCalledWith('?type=bug', { scroll: false });
    });
  });

  it('keeps mobile changelog filters collapsed until requested', () => {
    render(<ChangelogsPage />);

    const mobileFilterToggle = screen.getByTestId('changelog-mobile-filter-toggle');
    const filterGroup = screen.getByTestId('changelog-type-filters');

    expect(mobileFilterToggle).toHaveAttribute('aria-expanded', 'false');
    expect(filterGroup.className).toContain('hidden');
    expect(filterGroup.className).toContain('flex-wrap');
    expect(filterGroup.className).not.toContain('overflow-x-auto');

    fireEvent.click(mobileFilterToggle);

    expect(mobileFilterToggle).toHaveAttribute('aria-expanded', 'true');
    expect(filterGroup.className).not.toContain('hidden');
    expect(filterGroup.className).toContain('flex');
    expect(screen.getByRole('button', { name: /operator impact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade required/i })).toBeInTheDocument();
  });

  it('derives the operational impact summary from the loaded archive', () => {
    render(<ChangelogsPage />);

    const summary = screen.getByLabelText('Changelog operational impact summary');

    expect(summary).toHaveTextContent('March 2026 update');
    expect(summary).toHaveTextContent('2 protocol updates');
    expect(summary).toHaveTextContent('Operator impact');
    expect(summary).toHaveTextContent('1');
    expect(summary).not.toHaveTextContent('Latest Release');
    expect(summary).not.toHaveTextContent('v3.16');
  });

  it('scopes the operational summary to the active impact filter', async () => {
    render(<ChangelogsPage />);

    fireEvent.click(screen.getByRole('button', { name: /operator impact/i }));

    const summary = screen.getByLabelText('Changelog operational impact summary');

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenLastCalledWith('?type=operator-impact', { scroll: false });
    });

    expect(summary).toHaveTextContent('Filtered view');
    expect(summary).toHaveTextContent('Operator Impact');
    expect(summary).toHaveTextContent('1 matching update');
    expect(summary).toHaveTextContent('narrowed to 1 of 2 archived updates');
    expect(summary).toHaveTextContent('Operator impact');
    expect(summary).toHaveTextContent('LP impact0');
  });

  it('keeps the clicked filter active until search params catch up', async () => {
    render(<ChangelogsPage />);

    const allButton = screen.getByRole('button', { name: /all/i });
    const bugButton = screen.getByRole('button', { name: /bug/i });

    fireEvent.click(bugButton);

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenLastCalledWith('?type=bug', { scroll: false });
    });

    expect(allButton.style.backgroundColor).not.toBe('rgb(0, 204, 255)');
    expect(bugButton.style.backgroundColor).toBe('rgb(0, 204, 255)');
  });

  it('updates the active filter styling when URL changes', async () => {
    const { rerender } = render(<ChangelogsPage />);

    expect(screen.getByRole('button', { name: /all/i }).style.backgroundColor).toBe('rgb(0, 204, 255)');
    expect(screen.getByRole('button', { name: /bug/i }).style.backgroundColor).not.toBe('rgb(0, 204, 255)');

    mocks.searchParams.current = new URLSearchParams('type=bug');
    rerender(<ChangelogsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all/i }).style.backgroundColor).not.toBe('rgb(0, 204, 255)');
      expect(screen.getByRole('button', { name: /bug/i }).style.backgroundColor).toBe('rgb(0, 204, 255)');
    });
  });

  it('keeps a saved empty expanded set collapsed', async () => {
    localStorage.setItem('changelogs-expanded', '[]');

    render(<ChangelogsPage />);

    await waitFor(() => {
      const cardToggle = screen.getByRole('button', { name: /march 2026 update/i });
      const contentWrapper = cardToggle.nextElementSibling as HTMLElement;

      expect(contentWrapper.className).toContain('max-h-0');
      expect(contentWrapper.className).toContain('opacity-0');
    });
  });

  it('restores saved expanded months after mount without losing the operator preference', async () => {
    localStorage.setItem('changelogs-expanded', '["mar-2026"]');

    render(<ChangelogsPage />);

    const cardToggle = await screen.findByRole('button', { name: /march 2026 update/i });

    await waitFor(() => {
      const contentWrapper = cardToggle.nextElementSibling as HTMLElement;

      expect(cardToggle.getAttribute('aria-expanded')).toBe('true');
      expect(contentWrapper.className).toContain('max-h-[3000px]');
      expect(contentWrapper.className).toContain('opacity-100');
      expect(localStorage.getItem('changelogs-expanded')).toBe('["mar-2026"]');
    });
  });

  it('persists collapse-all by storing an empty expanded set', async () => {
    render(<ChangelogsPage />);

    const cardToggle = await screen.findByRole('button', { name: /march 2026 update/i });
    await waitFor(() => expect(cardToggle.getAttribute('aria-expanded')).toBe('true'));

    fireEvent.click(cardToggle);

    await waitFor(() => {
      expect(cardToggle.getAttribute('aria-expanded')).toBe('false');
      expect(localStorage.getItem('changelogs-expanded')).toBe('[]');
    });
  });

  it('keeps changelogs usable when browser storage is unavailable', async () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      render(<ChangelogsPage />);

      const cardToggle = await screen.findByRole('button', { name: /march 2026 update/i });
      expect(cardToggle).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(cardToggle);

      await waitFor(() => {
        expect(cardToggle).toHaveAttribute('aria-expanded', 'false');
      });
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });

  it('offers a reset when saved expanded state is corrupted', async () => {
    localStorage.setItem('changelogs-expanded', '{not json');
    localStorage.setItem('changelogs-expanded-entries', '{also broken');

    render(<ChangelogsPage />);

    const resetButton = await screen.findByRole('button', { name: /reset changelog display state/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /reset changelog display state/i })).not.toBeInTheDocument();
      expect(localStorage.getItem('changelogs-expanded')).toBe('["mar-2026"]');
      expect(localStorage.getItem('changelogs-expanded-entries')).toBeNull();
    });
  });
});
