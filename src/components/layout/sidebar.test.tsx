import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from './sidebar';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard/portfolio',
  searchParams: new URLSearchParams('address=thor1abc'),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.get(key),
    toString: () => mocks.searchParams.toString(),
  }),
}));

vi.mock('./theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock('./bifrost-status', () => ({
  BifrostStatus: () => <div>Source health mocked</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard/portfolio';
    mocks.searchParams = new URLSearchParams('address=thor1abc');
  });

  it('marks the current route as active on portfolio navigation', () => {
    mocks.pathname = '/dashboard/rewards';

    render(<Sidebar />);

    expect(screen.getByLabelText('Navigate to Rewards page')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Navigate to Portfolio page')).not.toHaveAttribute('aria-current');
  });

  it('preserves the address query when rendering navigation links', () => {
    render(<Sidebar />);

    expect(screen.getByLabelText('Navigate to Command Center page')).toHaveAttribute('href', '/dashboard?address=thor1abc');
    expect(screen.getByLabelText('Navigate to Changelogs page')).toHaveAttribute('href', '/dashboard/changelogs?address=thor1abc');
  });

  it('marks the command center active at the dashboard root', () => {
    mocks.pathname = '/dashboard';

    render(<Sidebar />);

    expect(screen.getByLabelText('Navigate to Command Center page')).toHaveAttribute('aria-current', 'page');
  });
});
