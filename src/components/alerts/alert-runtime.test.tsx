import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlertsContext } from '@/lib/hooks/use-alerts';
import { useBondPositionAlerts } from '@/lib/hooks/use-bond-position-alerts';
import { DASHBOARD_ADDRESS_CHANGED_EVENT, STORAGE_KEYS, writeDashboardAddress } from '@/lib/storage/keys';
import { AlertRuntime } from './alert-runtime';

vi.mock('@/lib/hooks/use-alerts', () => ({
  useAlertsContext: vi.fn(),
}));

vi.mock('@/lib/hooks/use-bond-position-alerts', () => ({
  useBondPositionAlerts: vi.fn(),
}));

const VALID_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';

function mockAlertContext() {
  return {
    alerts: [],
    alertHistory: [],
    permission: 'default' as NotificationPermission,
    preferences: {
      slashAlerts: true,
      jailAlerts: true,
      churnAlerts: true,
      statusAlerts: true,
    },
    requestPermission: vi.fn(),
    triggerAlert: vi.fn(),
    dismissAlert: vi.fn(),
    restoreAlert: vi.fn(),
    clearAllAlerts: vi.fn(),
    updatePreferences: vi.fn(),
    checkSlash: vi.fn(),
    checkJail: vi.fn(),
    checkStatusChange: vi.fn(),
  };
}

describe('AlertRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAlertsContext).mockReturnValue(mockAlertContext() as ReturnType<typeof useAlertsContext>);
  });

  it('monitors the saved address outside dashboard pages', async () => {
    localStorage.setItem(STORAGE_KEYS.dashboardAddress, VALID_ADDRESS);

    render(<AlertRuntime />);

    await waitFor(() => {
      expect(useBondPositionAlerts).toHaveBeenLastCalledWith(
        VALID_ADDRESS,
        expect.objectContaining({
          triggerAlert: expect.any(Function),
          checkSlash: expect.any(Function),
          checkJail: expect.any(Function),
          checkStatusChange: expect.any(Function),
        })
      );
    });
  });

  it('follows same-tab saved address changes immediately', async () => {
    render(<AlertRuntime />);

    act(() => {
      writeDashboardAddress(VALID_ADDRESS);
    });

    await waitFor(() => {
      expect(useBondPositionAlerts).toHaveBeenLastCalledWith(VALID_ADDRESS, expect.any(Object));
    });
  });

  it('follows cross-tab storage changes for the saved address', async () => {
    render(<AlertRuntime />);

    act(() => {
      localStorage.setItem(STORAGE_KEYS.dashboardAddress, VALID_ADDRESS);
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.dashboardAddress,
        newValue: VALID_ADDRESS,
      }));
    });

    await waitFor(() => {
      expect(useBondPositionAlerts).toHaveBeenLastCalledWith(VALID_ADDRESS, expect.any(Object));
    });
  });

  it('keeps monitoring stable when the custom event fires without storage access changes', async () => {
    localStorage.setItem(STORAGE_KEYS.dashboardAddress, VALID_ADDRESS);
    render(<AlertRuntime />);

    await waitFor(() => {
      expect(useBondPositionAlerts).toHaveBeenLastCalledWith(VALID_ADDRESS, expect.any(Object));
    });

    act(() => {
      window.dispatchEvent(new CustomEvent(DASHBOARD_ADDRESS_CHANGED_EVENT, { detail: { address: VALID_ADDRESS } }));
    });

    expect(useBondPositionAlerts).toHaveBeenLastCalledWith(VALID_ADDRESS, expect.any(Object));
  });
});
