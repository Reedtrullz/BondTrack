import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mutate } from 'swr';

import { getThorNameReverseLookupStorageKey } from '@/lib/storage/keys';
import type { ApiHealthState } from '@/lib/hooks/use-api-health';
import { DashboardShell, getSourceFreshnessLabel } from './dashboard-shell';

const mocks = vi.hoisted(() => ({
  address: 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz',
  reverseLookup: vi.fn(),
  walletAddress: null as string | null,
  walletBalance: null as number | null,
  useWalletBalance: vi.fn(),
  apiHealth: {
    midgard: 'healthy',
    thornode: 'healthy',
    lastChecked: new Date('2026-06-12T10:00:00Z'),
    lastSuccessful: {
      midgard: new Date('2026-06-12T10:00:00Z'),
      thornode: new Date('2026-06-12T10:00:00Z'),
    },
  } as ApiHealthState,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => key === 'address' ? mocks.address : null,
  }),
}));

vi.mock('swr', () => ({
  mutate: vi.fn(),
}));

vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <nav>Sidebar</nav>,
  MobileMenuButton: () => <button type="button">Menu</button>,
}));

vi.mock('@/components/wallet/wallet-connect', () => ({
  WalletConnect: () => <button type="button">Connect Wallet</button>,
}));

vi.mock('@/components/shared/breadcrumbs', () => ({
  Breadcrumbs: () => <div>Breadcrumbs</div>,
}));

vi.mock('@/components/shared/api-health-banner', () => ({
  ApiHealthBanner: () => null,
}));

vi.mock('@/components/dashboard/churn-countdown', () => ({
  ChurnCountdown: () => <div>Churn countdown</div>,
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mocks.apiHealth,
}));

vi.mock('@/lib/hooks/use-wallet', () => ({
  useWalletContext: () => ({ address: mocks.walletAddress }),
}));

vi.mock('@/lib/hooks/use-wallet-balance', () => ({
  useWalletBalance: (address: string | null) => {
    mocks.useWalletBalance(address);
    return { balance: mocks.walletBalance, isLoading: false };
  },
}));

vi.mock('@/lib/api/midgard', () => ({
  getTHORNameReverseLookupNoRetry: mocks.reverseLookup,
}));

describe('DashboardShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.walletAddress = null;
    mocks.walletBalance = null;
    mocks.apiHealth = {
      midgard: 'healthy',
      thornode: 'healthy',
      lastChecked: new Date('2026-06-12T10:00:00Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T10:00:00Z'),
        thornode: new Date('2026-06-12T10:00:00Z'),
      },
    };
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('silently treats optional THORName reverse lookup failures as no result', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.reverseLookup.mockRejectedValueOnce(new Error('optional lookup unavailable'));

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');
    await waitFor(() => expect(mocks.reverseLookup).toHaveBeenCalledWith(mocks.address));
    await waitFor(() => {
      expect(sessionStorage.getItem(getThorNameReverseLookupStorageKey(mocks.address))).toBe('__none__');
    });

    expect(screen.getByText('thor1qqq...eyjz')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('keeps rendering when THORName session storage is unavailable', async () => {
    const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    mocks.reverseLookup.mockResolvedValueOnce({ entry: { name: 'operator' } });

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('sessionStorage denied');
      },
    });

    try {
      render(
        <DashboardShell>
          <div>Dashboard content</div>
        </DashboardShell>
      );

      await screen.findByText('Dashboard content');
      await waitFor(() => expect(mocks.reverseLookup).toHaveBeenCalledWith(mocks.address));
      expect(await screen.findByText('operator')).toBeInTheDocument();
    } finally {
      if (originalSessionStorage) {
        Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
      }
    }
  });

  it('reports Midgard and THORNode freshness independently', () => {
    const now = Date.parse('2026-06-12T10:05:00Z');

    expect(getSourceFreshnessLabel(
      {
        midgard: new Date('2026-06-12T10:04:50Z'),
        thornode: new Date('2026-06-12T10:00:00Z'),
      },
      new Date('2026-06-12T10:05:00Z'),
      now
    )).toBe('Midgard 10s ago · THORNode 5m ago');
  });

  it('does not hide a pending source behind the source that has succeeded', () => {
    const now = Date.parse('2026-06-12T10:05:00Z');

    expect(getSourceFreshnessLabel(
      {
        midgard: new Date('2026-06-12T10:04:50Z'),
        thornode: null,
      },
      new Date('2026-06-12T10:05:00Z'),
      now
    )).toBe('Midgard 10s ago · THORNode pending');
  });

  it('clamps freshness labels when a source success timestamp is in the future', () => {
    const now = Date.parse('2026-06-12T10:05:00Z');

    expect(getSourceFreshnessLabel(
      {
        midgard: new Date('2026-06-12T10:05:10Z'),
        thornode: null,
      },
      new Date('2026-06-12T10:05:00Z'),
      now
    )).toBe('Midgard 0s ago · THORNode pending');
  });

  it('does not label a currently degraded source as synced because it succeeded earlier', async () => {
    mocks.apiHealth = {
      midgard: 'healthy',
      thornode: 'degraded',
      lastChecked: new Date('2026-06-12T10:05:00Z'),
      lastSuccessful: {
        midgard: new Date('2026-06-12T10:04:50Z'),
        thornode: new Date('2026-06-12T10:00:00Z'),
      },
    };
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');

    expect(screen.getByTestId('source-freshness-compact')).toHaveTextContent('Sources degraded');
    expect(screen.getByTestId('source-freshness-full')).toHaveTextContent('THORNode degraded');
    expect(screen.getByTestId('source-freshness-full')).not.toHaveTextContent('Sources synced');
  });

  it('labels healthy compact source status as checked rather than synced', async () => {
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');

    expect(screen.getByTestId('source-freshness-compact')).toHaveTextContent('Sources checked');
    expect(screen.getByTestId('source-freshness-compact')).not.toHaveTextContent('Sources synced');
  });

  it('labels mock-data builds as demo data in compact source status', async () => {
    mocks.apiHealth = {
      midgard: 'mock',
      thornode: 'mock',
      lastChecked: new Date('2026-06-12T10:05:00Z'),
      lastSuccessful: {
        midgard: null,
        thornode: null,
      },
    };
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');

    expect(screen.getByTestId('source-freshness-compact')).toHaveTextContent('Demo data');
    expect(screen.getByTestId('source-freshness-full')).toHaveTextContent('Midgard demo data');
    expect(screen.getByTestId('source-freshness-full')).toHaveTextContent('THORNode demo data');
    expect(screen.getByTestId('source-freshness-full')).not.toHaveTextContent('Sources synced');
  });

  it('refreshes static and address-bound dashboard data keys together', async () => {
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard data' }));

    expect(mutate).toHaveBeenCalledWith(expect.any(Function), undefined, { revalidate: true });

    const refreshPredicate = vi.mocked(mutate).mock.calls[0][0] as (key: unknown) => boolean;
    expect(refreshPredicate('nodes')).toBe(true);
    expect(refreshPredicate(['rune-price-history', 'day', 30])).toBe(true);
    expect(refreshPredicate(['bond-details', mocks.address])).toBe(true);
    expect(refreshPredicate(['lp-current', mocks.address])).toBe(true);
    expect(refreshPredicate(['lp-historical', mocks.address, 'pool-signature'])).toBe(true);
    expect(refreshPredicate(['transaction-history', mocks.address])).toBe(true);
    expect(refreshPredicate(['unrelated-feed', mocks.address])).toBe(false);
  });

  it('keeps verbose source and churn controls out of constrained header widths', async () => {
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');

    expect(screen.getByTestId('source-freshness-compact').className).toContain('xl:hidden');
    expect(screen.getByTestId('source-freshness-full').className).toContain('hidden xl:flex');
    expect(screen.getByTestId('churn-header-action').className).toContain('hidden xl:inline-flex');
  });

  it('renders the alert review trigger as a header action', async () => {
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell alertReviewTrigger={<button type="button" data-testid="header-alert-trigger">2 alerts</button>}>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');

    expect(screen.getByTestId('header-alert-trigger')).toBeVisible();
  });

  it('renders alert review as a secondary inspection panel when provided', async () => {
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell alertReviewPanel={<section data-testid="alert-review-panel">Alert review panel</section>}>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');

    const panel = screen.getByTestId('alert-review-panel');
    expect(panel).toBeVisible();
    expect(panel.parentElement).toHaveClass('lg:order-2');
  });

  it('shows the connected wallet balance instead of querying the watched dashboard address', async () => {
    mocks.walletAddress = 'thor1walletbalanceaddressxxxxxxxxxxxxxxxxxxxxx';
    mocks.walletBalance = 12.34;
    mocks.reverseLookup.mockResolvedValueOnce({ entry: null });

    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    await screen.findByText('Dashboard content');
    expect(mocks.useWalletBalance).toHaveBeenCalledWith(mocks.walletAddress);
    expect(mocks.useWalletBalance).not.toHaveBeenCalledWith(mocks.address);
    expect(screen.getByText(/Wallet:/)).toHaveTextContent('Wallet:');
    expect(screen.getByText(/Wallet:/)).toHaveTextContent('12.34');
  });
});
