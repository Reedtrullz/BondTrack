import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAlertsContext } from '@/lib/hooks/use-alerts';
import NotificationPreferences from './page';

vi.mock('@/lib/hooks/use-alerts', () => ({
  useAlertsContext: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'),
}));

const mockUseAlertsContext = vi.mocked(useAlertsContext);

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

describe('NotificationPreferences', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
      '/dashboard/risk?address=thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq&node=thor1nodehistorydismissed000000000000000'
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
      'In-app alerts still work and stay in this browser.'
    );
    expect(screen.queryByRole('button', { name: 'Enable browser notifications' })).not.toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
