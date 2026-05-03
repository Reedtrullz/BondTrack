import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LpStatusBadge } from './lp-status-badge';

describe('LpStatusBadge', () => {
  it.each([
    ['available', 'Available'],
    ['staged', 'Staged'],
    ['suspended', 'Suspended'],
    ['unknown', 'Unknown'],
  ] as const)('renders %s pool state labels', (status, label) => {
    render(<LpStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
