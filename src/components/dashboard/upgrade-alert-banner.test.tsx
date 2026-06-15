import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UpgradeAlertBanner } from './upgrade-alert-banner';

describe('UpgradeAlertBanner', () => {
  it('keeps the upgrade warning usable when browser storage is unavailable', async () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const onDismiss = vi.fn();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      render(
        <UpgradeAlertBanner
          currentVersion="3.15"
          latestVersion="3.16"
          onDismiss={onDismiss}
        />
      );

      expect(await screen.findByText('New protocol version available: 3.16')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      await waitFor(() => {
        expect(screen.queryByText('New protocol version available: 3.16')).not.toBeInTheDocument();
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });
});
