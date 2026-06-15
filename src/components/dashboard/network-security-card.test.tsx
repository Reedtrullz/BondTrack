import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NetworkSecurityCard } from './network-security-card';

describe('NetworkSecurityCard', () => {
  it('labels network security as a source-backed reading instead of an unconditional live claim', () => {
    render(
      <NetworkSecurityCard
        ratio={1.5}
        activeRatio={1.2}
        health="healthy"
        status="Network is well secured"
      />
    );

    const gauge = screen.getByRole('region', { name: 'Network security bond-to-pool gauge' });

    expect(gauge).toBeInTheDocument();
    expect(screen.getByLabelText('Bond-to-pool ratio')).toHaveTextContent('1.50x');
    expect(screen.getByText('Midgard reading')).toBeInTheDocument();
    expect(screen.getByText('freshness shown in source status')).toBeInTheDocument();
    expect(screen.queryByText('Live network')).not.toBeInTheDocument();
  });
});
