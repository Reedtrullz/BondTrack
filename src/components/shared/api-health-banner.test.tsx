import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils';
import { describe, expect, it } from 'vitest';

import { ApiHealthBanner } from './api-health-banner';

describe('ApiHealthBanner', () => {
  it.each([
    ['healthy sources', 'healthy', 'healthy'],
    ['pending sources', 'unknown', 'unknown'],
    ['local demo fixtures', 'mock', 'mock'],
  ] as const)('does not render for %s', (_label, midgard, thornode) => {
    render(<ApiHealthBanner midgard={midgard} thornode={thornode} />);

    expect(screen.queryByTestId('api-health-banner')).not.toBeInTheDocument();
  });

  it('renders stale-data copy for degraded sources and can be dismissed', async () => {
    const user = userEvent.setup();

    render(<ApiHealthBanner midgard="degraded" thornode="healthy" />);

    expect(screen.getByTestId('api-health-banner-midgard-message')).toHaveTextContent(
      'Midgard API is temporarily unavailable — some data may be stale'
    );

    await user.click(screen.getByRole('button', { name: 'Dismiss API health alert' }));

    expect(screen.queryByTestId('api-health-banner')).not.toBeInTheDocument();
  });

  it('renders unavailable-data copy for down sources', () => {
    render(<ApiHealthBanner midgard="healthy" thornode="down" />);

    expect(screen.getByTestId('api-health-banner-thornode-message')).toHaveTextContent(
      'THORNode API is unreachable — data may be unavailable'
    );
  });
});
