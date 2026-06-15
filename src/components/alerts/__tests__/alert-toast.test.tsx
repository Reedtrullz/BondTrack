import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertReviewTrigger, AlertToast, NotificationPermissionNudge } from '../alert-toast';

const liveAlerts = [
  {
    id: 'slash-1',
    type: 'SLASH_INCREASE' as const,
    nodeAddress: 'thor1node1',
    message: 'Node thor1node1 slashed: +4 points',
    timestamp: Date.now(),
    dismissed: false,
  },
  {
    id: 'jail-1',
    type: 'JAIL' as const,
    nodeAddress: 'thor1node2',
    message: 'Node thor1node2 entered jail',
    timestamp: Date.now(),
    dismissed: false,
  },
];

const manyLiveAlerts = [
  ...liveAlerts,
  {
    id: 'churn-1',
    type: 'CHURN_RISK' as const,
    nodeAddress: 'thor1node3',
    message: 'Node thor1node3 is entering churn risk',
    timestamp: Date.now(),
    dismissed: false,
  },
  {
    id: 'status-1',
    type: 'NODE_STATUS_CHANGE' as const,
    nodeAddress: 'thor1node4',
    message: 'Node thor1node4 status changed: Active to Standby',
    timestamp: Date.now(),
    dismissed: false,
  },
];

describe('AlertToast notification prompt', () => {
  const defaultProps = {
    onRequestPermission: vi.fn<() => Promise<boolean>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem = vi.fn().mockReturnValue(null);
    window.localStorage.setItem = vi.fn();
    window.localStorage.removeItem = vi.fn();
  });

  it('renders the prompt as a compact non-blocking header action with a visible dismiss action', () => {
    render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
      />
    );

    const promptCard = screen.getByRole('status');

    expect(screen.getByText('Alerts off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss notification prompt' })).toBeInTheDocument();
    expect(promptCard).toHaveAttribute('data-placement', 'header-action');
    expect(promptCard).toHaveClass('2xl:inline-flex');
    expect(promptCard).not.toHaveClass('xl:inline-flex');
    expect(promptCard).not.toHaveClass('mb-4');
    expect(promptCard).not.toHaveClass('fixed');
    expect(promptCard).not.toHaveClass('bottom-4');
    expect(promptCard).not.toHaveClass('right-4');
    expect(promptCard).not.toHaveClass('left-4');
    expect(promptCard).not.toHaveClass('left-1/2');
    expect(promptCard).not.toHaveClass('-translate-x-1/2');
  });

  it('routes operators to notification settings when permission is not granted', async () => {
    defaultProps.onRequestPermission.mockResolvedValueOnce(false);

    render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
        settingsHref="/dashboard/settings/notifications?address=thor1operator"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    expect(await screen.findByText('Alerts blocked')).toBeInTheDocument();
    expect(defaultProps.onRequestPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open notification settings' })).toHaveAttribute(
      'href',
      '/dashboard/settings/notifications?address=thor1operator'
    );
  });

  it('shows settings guidance immediately when browser notifications are denied', () => {
    render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="denied"
        settingsHref="/dashboard/settings/notifications"
      />
    );

    expect(screen.getByText('Alerts blocked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open notification settings' })).toHaveAttribute(
      'href',
      '/dashboard/settings/notifications'
    );
    expect(defaultProps.onRequestPermission).not.toHaveBeenCalled();
  });

  it('hides the prompt after dismissal and respects the persisted dismissal state', async () => {
    const { unmount } = render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification prompt' }));

    expect(screen.queryByText('Alerts off')).not.toBeInTheDocument();

    unmount();

    window.localStorage.getItem = vi.fn().mockReturnValue('true');

    render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Alerts off')).not.toBeInTheDocument();
    });
  });

  it('keeps the prompt usable when browser storage cannot be read', () => {
    window.localStorage.getItem = vi.fn(() => {
      throw new Error('Storage access denied');
    });

    render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
      />
    );

    expect(screen.getByText('Alerts off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('dismisses the prompt even when browser storage cannot persist the preference', () => {
    window.localStorage.setItem = vi.fn(() => {
      throw new Error('Storage write denied');
    });

    render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification prompt' }));

    expect(screen.queryByText('Alerts off')).not.toBeInTheDocument();
  });

  it('does not crash when permission is granted and browser storage cleanup fails', async () => {
    window.localStorage.removeItem = vi.fn(() => {
      throw new Error('Storage cleanup denied');
    });

    const { rerender } = render(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="default"
      />
    );

    expect(screen.getByText('Alerts off')).toBeInTheDocument();

    rerender(
      <NotificationPermissionNudge
        {...defaultProps}
        permission="granted"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Alerts off')).not.toBeInTheDocument();
    });
  });
});

describe('AlertToast live alerts', () => {
  it('renders a reusable header trigger without mounting the fixed review region', () => {
    const onOpen = vi.fn();

    render(
      <AlertReviewTrigger
        alerts={liveAlerts}
        isReviewOpen={false}
        onOpen={onOpen}
        variant="header"
      />
    );

    const reviewTrigger = screen.getByRole('button', { name: 'Open alert review for 2 node alerts' });

    expect(reviewTrigger).toHaveAttribute('data-placement', 'header-action');
    expect(reviewTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(reviewTrigger).toHaveClass('relative');
    expect(reviewTrigger).toHaveClass('h-10');
    expect(reviewTrigger).toHaveClass('w-10');
    expect(reviewTrigger).toHaveClass('sm:h-9');
    expect(reviewTrigger).toHaveClass('sm:w-auto');
    expect(screen.queryByRole('region', { name: 'Node alerts' })).not.toBeInTheDocument();

    fireEvent.click(reviewTrigger);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('can delegate the collapsed trigger to the shell without mounting a fixed overlay', () => {
    render(
      <AlertToast
        alerts={liveAlerts}
        dashboardAddress="thor1dashboardaddress"
        isReviewOpen={false}
        onDismiss={vi.fn()}
        onReviewOpenChange={vi.fn()}
        renderCollapsedTrigger={false}
      />
    );

    expect(screen.queryByRole('region', { name: 'Node alerts' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('node-alert-review-trigger')).not.toBeInTheDocument();
  });

  it('renders the controlled review as a non-overlay inspection panel when opened from the shell trigger', () => {
    const onReviewOpenChange = vi.fn();

    render(
      <AlertToast
        alerts={liveAlerts}
        dashboardAddress="thor1dashboardaddress"
        isReviewOpen
        onDismiss={vi.fn()}
        onReviewOpenChange={onReviewOpenChange}
        presentation="inspector"
        renderCollapsedTrigger={false}
      />
    );

    const region = screen.getByRole('region', { name: 'Node alerts' });

    expect(region).toHaveAttribute('data-state', 'expanded');
    expect(region).toHaveAttribute('data-placement', 'inspection-panel');
    expect(region).toHaveClass('static');
    expect(region).toHaveClass('w-full');
    expect(region).toHaveClass('lg:sticky');
    expect(region).not.toHaveClass('fixed');
    expect(screen.queryByTestId('node-alert-review-trigger')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('node-alert-toast-item')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse 2 node alerts' }));

    expect(onReviewOpenChange).toHaveBeenCalledWith(false);
  });

  it('uses a compact alert trigger without expanding alert cards over dashboard content', () => {
    render(
      <AlertToast
        alerts={liveAlerts}
        dashboardAddress="thor1dashboardaddress"
        onDismiss={vi.fn()}
      />
    );

    const region = screen.getByRole('region', { name: 'Node alerts' });
    const items = screen.getAllByTestId('node-alert-toast-item');
    const primaryMessage = screen.getByText('Node thor1node1 slashed: +4 points');
    const reviewTrigger = screen.getByTestId('node-alert-review-trigger');

    expect(region).toHaveAttribute('data-state', 'collapsed');
    expect(region).toHaveClass('right-[calc(env(safe-area-inset-right)+0.75rem)]');
    expect(region).toHaveClass('left-auto');
    expect(region).toHaveClass('h-11');
    expect(region).toHaveClass('w-11');
    expect(region).toHaveClass('overflow-visible');
    expect(region).toHaveClass('sm:w-auto');
    expect(region).toHaveClass('lg:left-4');
    expect(region).toHaveClass('lg:right-auto');
    expect(region).not.toHaveClass('inset-x-3');
    expect(region).not.toHaveClass('sm:overflow-hidden');
    expect(region).not.toHaveClass('sm:max-h-none');
    expect(reviewTrigger).toHaveAccessibleName('Open alert review for 2 node alerts');
    expect(reviewTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(reviewTrigger).toHaveClass('h-11');
    expect(reviewTrigger).toHaveClass('w-11');
    expect(reviewTrigger).toHaveClass('sm:w-auto');
    expect(reviewTrigger).toHaveClass('sm:px-3');
    expect(reviewTrigger).toHaveClass('rounded-full');
    expect(reviewTrigger).toHaveClass('focus-visible:ring-2');
    expect(reviewTrigger).toHaveTextContent('2 node alerts');
    expect(items[0]).toHaveClass('items-center');
    expect(items[0]).toHaveClass('sm:items-start');
    expect(items[0]).toHaveClass('rounded-full');
    expect(items[0]).toHaveClass('sm:rounded-lg');
    expect(items[0]).toHaveClass('px-2.5');
    expect(items[0]).toHaveClass('py-2');
    expect(items[0]).toHaveClass('hidden');
    expect(items[0]).toHaveClass('bg-amber-50/95');
    expect(items[0]).toHaveClass('dark:bg-amber-950/95');
    expect(items[0]).toHaveClass('backdrop-blur-md');
    expect(primaryMessage).toHaveClass('hidden');
    expect(primaryMessage).toHaveClass('line-clamp-1');
    expect(primaryMessage).toHaveClass('flex-1');
    expect(screen.getAllByRole('link', { name: /Inspect risk context/ })[0]).toHaveAttribute(
      'href',
      '/dashboard/risk?address=thor1dashboardaddress&node=thor1node1'
    );
    expect(screen.getAllByRole('link', { name: /Inspect risk context/ })[0]).toHaveClass('hidden');
    expect(items[1]).toHaveClass('hidden');
    expect(items[1]).not.toHaveClass('sm:flex');
  });

  it('expands compact alerts into a review list', () => {
    render(
      <AlertToast
        alerts={liveAlerts}
        dashboardAddress="thor1dashboardaddress"
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open alert review for 2 node alerts' }));

    const region = screen.getByRole('region', { name: 'Node alerts' });
    const items = screen.getAllByTestId('node-alert-toast-item');
    const primaryMessage = screen.getByText('Node thor1node1 slashed: +4 points');
    const toggleButton = screen.getByRole('button', { name: 'Collapse 2 node alerts' });

    expect(region).toHaveAttribute('data-state', 'expanded');
    expect(region).toHaveClass('inset-x-3');
    expect(region).toHaveClass('max-h-[min(75vh,28rem)]');
    expect(region).toHaveClass('overflow-y-auto');
    expect(region).toHaveClass('lg:left-4');
    expect(region).toHaveClass('lg:right-auto');
    expect(toggleButton).toHaveTextContent('Hide');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(primaryMessage).not.toHaveClass('line-clamp-1');
    expect(primaryMessage).toHaveClass('whitespace-normal');
    expect(screen.getAllByRole('link', { name: /Inspect risk context/ })[0]).toHaveClass('inline-flex');
    expect(items[1]).toHaveClass('flex');
    expect(items[1]).not.toHaveClass('hidden');
    expect(screen.getAllByText('Just now')).toHaveLength(2);
  });

  it('opens the review list from the mobile compact alert button', () => {
    render(
      <AlertToast
        alerts={liveAlerts}
        dashboardAddress="thor1dashboardaddress"
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open alert review for 2 node alerts' }));

    const region = screen.getByRole('region', { name: 'Node alerts' });

    expect(region).toHaveAttribute('data-state', 'expanded');
    expect(screen.getAllByTestId('node-alert-toast-item')).toHaveLength(2);
    expect(screen.getByText('Node thor1node2 entered jail')).toBeInTheDocument();
    expect(screen.queryByTestId('node-alert-review-trigger')).not.toBeInTheDocument();
  });

  it('renders every active alert when the review list is expanded', () => {
    render(
      <AlertToast
        alerts={manyLiveAlerts}
        dashboardAddress="thor1dashboardaddress"
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('node-alert-toast-item')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Open alert review for 4 node alerts' }));

    expect(screen.getAllByTestId('node-alert-toast-item')).toHaveLength(4);
    expect(screen.getByText('Node thor1node3 is entering churn risk')).toBeInTheDocument();
    expect(screen.getByText('Node thor1node4 status changed: Active to Standby')).toBeInTheDocument();
  });

  it('dismisses the selected alert from the review list', () => {
    const onDismiss = vi.fn();

    render(
      <AlertToast
        alerts={[
          {
            id: 'slash-1',
            type: 'SLASH_INCREASE',
            nodeAddress: 'thor1node1',
            message: 'Node thor1node1 slashed: +4 points',
            timestamp: Date.now(),
            dismissed: false,
          },
        ]}
        dashboardAddress="thor1dashboardaddress"
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open alert review for 1 node alert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert: Node thor1node1 slashed: +4 points' }));

    expect(onDismiss).toHaveBeenCalledWith('slash-1');
    expect(screen.getByRole('button', { name: 'Dismiss alert: Node thor1node1 slashed: +4 points' })).toHaveClass('h-7');
    expect(screen.getByRole('button', { name: 'Dismiss alert: Node thor1node1 slashed: +4 points' })).toHaveClass('w-7');
    expect(screen.getByRole('button', { name: 'Dismiss alert: Node thor1node1 slashed: +4 points' })).toHaveClass('focus-visible:ring-2');
  });
});
