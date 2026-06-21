import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NetworkSecurityCard } from './network-security-card';

describe('NetworkSecurityCard', () => {
  it('labels network security as a network-scoped source reading instead of a provider all-clear', () => {
    render(
      <NetworkSecurityCard
        ratio={1.5}
        activeRatio={1.2}
        health="healthy"
        status="Bond buffer in range"
      />
    );

    const gauge = screen.getByRole('region', { name: 'Network security bond-to-pool gauge' });

    expect(gauge).toBeInTheDocument();
    expect(screen.getByLabelText('Bond-to-pool ratio')).toHaveTextContent('1.50x');
    expect(gauge).toHaveTextContent('Network in range');
    expect(gauge).toHaveTextContent('Bond buffer in range');
    expect(gauge).toHaveTextContent('Network-level bond coverage, not a provider safety verdict');
    expect(screen.getByText('Midgard reading')).toBeInTheDocument();
    expect(screen.getByText('freshness shown in source status')).toBeInTheDocument();
    expect(screen.queryByText('Live network')).not.toBeInTheDocument();
    expect(gauge).not.toHaveTextContent(/\bhealthy\b|well secured|\bsafe\b|provider in range/i);

    const badge = screen.getByText('Network in range').closest('span');
    expect(badge).toHaveClass('bg-sky-50');
    expect(badge).not.toHaveClass('bg-emerald-50');
    expect(screen.getByLabelText('Bond-to-pool ratio')).toHaveClass('text-sky-600');
    expect(screen.getByLabelText('Bond-to-pool ratio')).not.toHaveClass('text-emerald-600');
  });
});
