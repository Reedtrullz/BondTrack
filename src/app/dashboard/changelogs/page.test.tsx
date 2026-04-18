
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
        description: 'A critical fix shipped.',
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
});
