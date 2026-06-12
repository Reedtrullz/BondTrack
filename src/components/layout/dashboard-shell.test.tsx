import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getThorNameReverseLookupStorageKey } from '@/lib/storage/keys';
import { DashboardShell, getSourceFreshnessLabel } from './dashboard-shell';

const mocks = vi.hoisted(() => ({
  address: 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  reverseLookup: vi.fn(),
  walletAddress: null as string | null,
  walletBalance: null as number | null,
  useWalletBalance: vi.fn(),
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
  useApiHealthContext: () => ({
    midgard: 'healthy',
    thornode: 'healthy',
    lastChecked: new Date('2026-06-12T10:00:00Z'),
    lastSuccessful: {
      midgard: new Date('2026-06-12T10:00:00Z'),
      thornode: new Date('2026-06-12T10:00:00Z'),
    },
  }),
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

    expect(screen.getByText('thor1qqq...qqqq')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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
