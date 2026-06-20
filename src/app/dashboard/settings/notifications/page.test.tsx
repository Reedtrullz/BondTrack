import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlertsContext } from '@/lib/hooks/use-alerts';
import { useBackgroundNotifications } from '@/lib/hooks/use-background-notifications';
import NotificationPreferences from './page';

vi.mock('@/lib/hooks/use-alerts', () => ({
  useAlertsContext: vi.fn(),
}));

vi.mock('@/lib/hooks/use-background-notifications', () => ({
  useBackgroundNotifications: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz'),
}));

const mockUseAlertsContext = vi.mocked(useAlertsContext);
const mockUseBackgroundNotifications = vi.mocked(useBackgroundNotifications);

function mockAlertContext(overrides: Record<string, unknown> = {}) {
  return {
    alerts: [],
    alertHistory: [],
    clearAllAlerts: vi.fn(),
    checkJail: vi.fn(),
    checkSlash: vi.fn(),
    checkStatusChange: vi.fn(),
    dismissAlert: vi.fn(),
    permission: 'default' as NotificationPermission,
    preferences: {
      slashAlerts: true,
      jailAlerts: true,
      churnAlerts: true,
      statusAlerts: true,
    },
    requestPermission: vi.fn(),
    restoreAlert: vi.fn(),
    triggerAlert: vi.fn(),
    updatePreferences: vi.fn(),
    ...overrides,
  };
}

function mockBackgroundNotificationState(overrides: Partial<ReturnType<typeof useBackgroundNotifications>> = {}) {
  return {
    capability: {
      configured: true,
      publicKey: 'test-public-key',
      reason: null,
      subscriptionCount: 0,
      monitor: {
        checkedSubscriptionCount: 0,
        expiredSubscriptionCount: 0,
        failedSubscriptionCount: 0,
        lastCheckedAt: null,
        staleAfterMs: 300_000,
        staleSubscriptionCount: 0,
        uncheckedSubscriptionCount: 0,
      },
    },
    error: null,
    isConfigured: true,
    isSubscribed: false,
    monitor: {
      checkedSubscriptionCount: 0,
      expiredSubscriptionCount: 0,
      failedSubscriptionCount: 0,
      lastCheckedAt: null,
      staleAfterMs: 300_000,
      staleSubscriptionCount: 0,
      uncheckedSubscriptionCount: 0,
    },
    refresh: vi.fn(),
    status: 'ready' as const,
    subscribe: vi.fn(),
    subscriptionCount: 0,
    unsubscribe: vi.fn(),
    ...overrides,
  };
}

describe('NotificationPreferences', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState());
  });

  it('shows recoverable local alert history with active and dismissed counts', async () => {
    const restoreAlert = vi.fn();
    const clearAllAlerts = vi.fn();
    const now = Date.now();

    mockUseAlertsContext.mockReturnValue(mockAlertContext({
      alertHistory: [
        {
          id: 'slash-alert',
          type: 'SLASH_INCREASE',
          nodeAddress: 'thor1nodehistoryactive000000000000000000',
          message: 'Node thor1nodehistory... slashed: +4 points',
          timestamp: now - 60_000,
          dismissed: false,
        },
        {
          id: 'jail-alert',
          type: 'JAIL',
          nodeAddress: 'thor1nodehistorydismissed000000000000000',
          message: 'Node thor1nodehistory... has been jailed: missed observation',
          timestamp: now - 120_000,
          dismissed: true,
        },
      ],
      clearAllAlerts,
      restoreAlert,
    }) as ReturnType<typeof useAlertsContext>);

    render(<NotificationPreferences />);

    expect(await screen.findByText('Local Alert History')).toBeInTheDocument();

    const historyScope = within(screen.getByTestId('local-alert-history'));

    expect(historyScope.getByText(/dismissed from the alert rail/i)).toBeInTheDocument();
    expect(historyScope.queryByText(/dismissed from the live rail/i)).not.toBeInTheDocument();
    expect(historyScope.getAllByText('Active')).toHaveLength(2);
    expect(historyScope.getAllByText('Dismissed')).toHaveLength(2);
    const slashAlert = historyScope.getByText('Node thor1nodehistory... slashed: +4 points');
    const jailAlert = historyScope.getByText('Node thor1nodehistory... has been jailed: missed observation');
    const inspectRiskLinks = historyScope.getAllByRole('link', { name: /Inspect risk context/ });

    expect(historyScope.getByText('1m ago')).toBeInTheDocument();
    expect(historyScope.getByText('2m ago')).toBeInTheDocument();
    expect(slashAlert).toBeInTheDocument();
    expect(jailAlert).toBeInTheDocument();
    expect(jailAlert.compareDocumentPosition(slashAlert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(inspectRiskLinks[0]).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz&node=thor1nodehistorydismissed000000000000000'
    );

    fireEvent.click(historyScope.getByRole('button', { name: 'Show again' }));
    expect(restoreAlert).toHaveBeenCalledWith('jail-alert');

    fireEvent.click(historyScope.getByRole('button', { name: 'Clear history' }));
    expect(clearAllAlerts).toHaveBeenCalled();
  });

  it('shows an honest empty alert history state', async () => {
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);

    render(<NotificationPreferences />);

    expect(await screen.findByText('Local Alert History')).toBeInTheDocument();
    expect(screen.getByText('No local alert history yet. Heimdall will keep recent node alerts here after they appear.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeDisabled();
  });

  it('does not offer a retry-style permission action when browser notifications are blocked', async () => {
    const requestPermission = vi.fn();

    mockUseAlertsContext.mockReturnValue(mockAlertContext({
      permission: 'denied',
      requestPermission,
    }) as ReturnType<typeof useAlertsContext>);

    render(<NotificationPreferences />);

    expect(await screen.findByText('Browser notifications blocked in this browser')).toBeInTheDocument();
    expect(screen.getByTestId('browser-notification-blocked-guidance')).toHaveTextContent('Browser setting required');
    expect(screen.getByTestId('browser-notification-blocked-guidance')).toHaveTextContent(
      'In-app alerts still work while a Heimdall tab is open.'
    );
    expect(screen.queryByRole('button', { name: 'Enable browser notifications' })).not.toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not offer background push enablement while browser notification permission is blocked', async () => {
    const subscribe = vi.fn();

    mockUseAlertsContext.mockReturnValue(mockAlertContext({
      permission: 'denied',
    }) as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      status: 'ready',
      subscribe,
    }));

    render(<NotificationPreferences />);

    const backgroundStatus = await screen.findByTestId('background-notification-status');
    expect(backgroundStatus).toHaveTextContent('Browser notification permission blocked.');
    expect(backgroundStatus).toHaveTextContent(
      'Allow notifications for this site in your browser settings before enabling closed-tab provider exposure alerts.'
    );
    expect(backgroundStatus).toHaveTextContent('Browser setting required');
    expect(backgroundStatus.querySelector('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable background push' })).not.toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('shows unsubscribed background push as available, not ready or proven', async () => {
    const subscribe = vi.fn();
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({ subscribe }));

    render(<NotificationPreferences />);

    const backgroundStatus = await screen.findByTestId('background-notification-status');
    expect(backgroundStatus).toHaveTextContent('Background push available.');
    expect(screen.getByTestId('background-notification-status')).toHaveTextContent(
      'Enable browser push to create a subscription; closed-tab provider alerts are not active until this browser is subscribed and the server monitor checks it.'
    );
    expect(backgroundStatus).not.toHaveTextContent('Background delivery ready.');
    expect(backgroundStatus).not.toHaveTextContent('Background delivery active.');
    expect(backgroundStatus).not.toHaveTextContent(/proven/i);
    expect(screen.getByRole('button', { name: 'Enable background push' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Enable background push' }));
    expect(subscribe).toHaveBeenCalled();
  });

  it('shows closed-tab delivery status before disconnected channel caveats', async () => {
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);

    render(<NotificationPreferences />);

    const heading = await screen.findByRole('heading', { name: 'Notification Preferences' });
    const backgroundStatus = screen.getByTestId('background-notification-status');
    const disconnectedChannels = screen.getByText('Email and Telegram are not connected yet.');

    expect(heading.compareDocumentPosition(backgroundStatus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(backgroundStatus.compareDocumentPosition(disconnectedChannels) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows background delivery as active when this browser is subscribed', async () => {
    const unsubscribe = vi.fn();
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      isSubscribed: true,
      monitor: {
        checkedSubscriptionCount: 1,
        expiredSubscriptionCount: 0,
        failedSubscriptionCount: 0,
        lastCheckedAt: Date.now() - 60_000,
        staleAfterMs: 300_000,
        staleSubscriptionCount: 0,
        uncheckedSubscriptionCount: 0,
      },
      status: 'subscribed',
      subscriptionCount: 1,
      unsubscribe,
    }));

    render(<NotificationPreferences />);

    expect(await screen.findByTestId('background-notification-status')).toHaveTextContent('Background delivery active.');
    expect(screen.getByTestId('background-notification-status')).toHaveTextContent('Server subscriptions for this address: 1');
    fireEvent.click(screen.getByRole('button', { name: 'Disable background push' }));
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not imply closed-tab delivery is proven before the server monitor has checked the subscription', async () => {
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      isSubscribed: true,
      status: 'subscribed',
      subscriptionCount: 1,
      monitor: {
        checkedSubscriptionCount: 0,
        expiredSubscriptionCount: 0,
        failedSubscriptionCount: 0,
        lastCheckedAt: null,
        staleAfterMs: 300_000,
        staleSubscriptionCount: 1,
        uncheckedSubscriptionCount: 1,
      },
    }));

    render(<NotificationPreferences />);

    const backgroundStatus = await screen.findByTestId('background-notification-status');
    expect(backgroundStatus).toHaveTextContent('Background subscription pending verification.');
    expect(backgroundStatus).not.toHaveTextContent('Background delivery active.');
    expect(backgroundStatus).toHaveTextContent('Monitor confidence');
    expect(backgroundStatus).toHaveTextContent('Awaiting first server monitor check');
    expect(backgroundStatus).toHaveTextContent('Closed-tab delivery is subscribed, but not proven yet.');
  });

  it('surfaces monitor failures before asking users to trust closed-tab delivery', async () => {
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      isSubscribed: true,
      status: 'subscribed',
      subscriptionCount: 2,
      monitor: {
        checkedSubscriptionCount: 2,
        expiredSubscriptionCount: 0,
        failedSubscriptionCount: 1,
        lastCheckedAt: 1_735_689_600_000,
        staleAfterMs: 300_000,
        staleSubscriptionCount: 0,
        uncheckedSubscriptionCount: 0,
      },
    }));

    render(<NotificationPreferences />);

    const backgroundStatus = await screen.findByTestId('background-notification-status');
    expect(backgroundStatus).toHaveTextContent('Background delivery needs review.');
    expect(backgroundStatus).not.toHaveTextContent('Background delivery active.');
    expect(backgroundStatus).toHaveTextContent('Monitor confidence');
    expect(backgroundStatus).toHaveTextContent('Last server monitor check failed for 1 subscribed browser.');
    expect(backgroundStatus).not.toHaveTextContent('410 Gone');
  });

  it('warns when the last successful server monitor check is stale', async () => {
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      isSubscribed: true,
      status: 'subscribed',
      subscriptionCount: 1,
      monitor: {
        checkedSubscriptionCount: 1,
        expiredSubscriptionCount: 0,
        failedSubscriptionCount: 0,
        lastCheckedAt: Date.now() - 60 * 60 * 1000,
        staleAfterMs: 300_000,
        staleSubscriptionCount: 1,
        uncheckedSubscriptionCount: 0,
      },
    }));

    render(<NotificationPreferences />);

    const backgroundStatus = await screen.findByTestId('background-notification-status');
    expect(backgroundStatus).toHaveTextContent('Background monitor stale.');
    expect(backgroundStatus).not.toHaveTextContent('Background delivery active.');
    expect(backgroundStatus).toHaveTextContent('Monitor confidence');
    expect(backgroundStatus).toHaveTextContent('Last server monitor check is stale');
    expect(backgroundStatus).toHaveTextContent('Closed-tab delivery may be delayed until the monitor catches up.');
  });

  it('warns when the stored background subscription has expired', async () => {
    const subscribe = vi.fn();
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      isSubscribed: false,
      status: 'expired',
      subscribe,
      subscriptionCount: 0,
      monitor: {
        checkedSubscriptionCount: 0,
        expiredSubscriptionCount: 1,
        failedSubscriptionCount: 0,
        lastCheckedAt: null,
        staleAfterMs: 300_000,
        staleSubscriptionCount: 0,
        uncheckedSubscriptionCount: 0,
      },
    }));

    render(<NotificationPreferences />);

    const backgroundStatus = await screen.findByTestId('background-notification-status');
    expect(backgroundStatus).toHaveTextContent('Background subscription expired.');
    expect(backgroundStatus).toHaveTextContent('Re-enable browser push to restore closed-tab provider exposure alerts.');
    expect(backgroundStatus).not.toHaveTextContent('Background delivery active.');
    fireEvent.click(screen.getByRole('button', { name: 'Enable background push' }));
    expect(subscribe).toHaveBeenCalled();
  });

  it('is explicit when background push is unavailable and does not offer an impossible enable action', async () => {
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      capability: {
        configured: false,
        publicKey: null,
        reason: 'Web Push VAPID keys are not configured on this Heimdall runtime.',
        subscriptionCount: 0,
      },
      isConfigured: false,
      status: 'unconfigured',
    }));

    render(<NotificationPreferences />);

    expect(await screen.findByTestId('browser-notification-scope')).toHaveTextContent('Open-tab fallback');
    expect(screen.getByTestId('browser-notification-scope')).toHaveTextContent(
      'background throttling can delay checks.'
    );
    expect(screen.getByTestId('background-notification-status')).toHaveTextContent(
      'Background push unavailable.'
    );
    expect(screen.getByTestId('background-notification-status')).toHaveTextContent('Server setup required');
    expect(screen.queryByRole('button', { name: 'Enable background push' })).not.toBeInTheDocument();
  });

  it('routes background push status errors to a retry instead of a subscribe attempt', async () => {
    const refresh = vi.fn();
    const subscribe = vi.fn();
    mockUseAlertsContext.mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
    mockUseBackgroundNotifications.mockReturnValue(mockBackgroundNotificationState({
      error: 'Unable to read notification status',
      refresh,
      status: 'error',
      subscribe,
    }));

    render(<NotificationPreferences />);

    expect(await screen.findByTestId('background-notification-status')).toHaveTextContent('Background push needs review.');
    expect(screen.queryByRole('button', { name: 'Enable background push' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry status check' }));

    expect(refresh).toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });
});
