import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertToast } from '../alert-toast';

describe('AlertToast notification prompt', () => {
  const defaultProps = {
    alerts: [],
    onDismiss: vi.fn(),
    onRequestPermission: vi.fn<() => Promise<boolean>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem = vi.fn().mockReturnValue(null);
  });

  it('renders the prompt with a non-blocking bottom placement and a visible dismiss action', () => {
    render(
      <AlertToast
        {...defaultProps}
        permission="default"
      />
    );

    const promptCard = screen.getByRole('status');

    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    expect(promptCard.parentElement).toHaveClass('bottom-4');
    expect(promptCard.parentElement).not.toHaveClass('top-20');
  });

  it('shows follow-up guidance when permission is not granted', async () => {
    defaultProps.onRequestPermission.mockResolvedValueOnce(false);

    render(
      <AlertToast
        {...defaultProps}
        permission="default"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    expect(await screen.findByText('Notifications are still off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('hides the prompt after dismissal and respects the persisted dismissal state', async () => {
    const { unmount } = render(
      <AlertToast
        {...defaultProps}
        permission="default"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();

    unmount();

    window.localStorage.getItem = vi.fn().mockReturnValue('true');

    render(
      <AlertToast
        {...defaultProps}
        permission="default"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
    });
  });
});
