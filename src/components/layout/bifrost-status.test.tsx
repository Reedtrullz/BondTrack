import { render, screen } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BifrostStatus } from './bifrost-status';
import type { ApiHealthStatus } from '@/lib/hooks/use-api-health';

const mocks = vi.hoisted(() => ({
  apiHealth: {
    midgard: 'healthy' as ApiHealthStatus,
    thornode: 'healthy' as ApiHealthStatus,
  },
}));

vi.mock('@/lib/hooks/use-api-health', () => ({
  useApiHealthContext: () => mocks.apiHealth,
}));

describe('BifrostStatus', () => {
  beforeEach(() => {
    mocks.apiHealth = {
      midgard: 'healthy',
      thornode: 'healthy',
    };
  });

  it('describes successful source checks as responding instead of broadly healthy', () => {
    render(<BifrostStatus />);

    expect(screen.getByText('Sources responding')).toBeInTheDocument();
    expect(screen.getByText('Recent Midgard + THORNode checks responded')).toBeInTheDocument();
    expect(screen.queryByText('Recent Midgard + THORNode checks succeeded')).not.toBeInTheDocument();
    expect(screen.queryByText('Sources healthy')).not.toBeInTheDocument();
    expect(screen.queryByText('Midgard + THORNode confirmed')).not.toBeInTheDocument();
  });

  it('describes degraded and failing checks as source-check states', () => {
    mocks.apiHealth = {
      midgard: 'degraded',
      thornode: 'healthy',
    };

    const { rerender } = render(<BifrostStatus />);

    expect(screen.getByText('Source checks degraded')).toBeInTheDocument();
    expect(screen.getByText('One recent check is retrying')).toBeInTheDocument();

    mocks.apiHealth = {
      midgard: 'down',
      thornode: 'healthy',
    };

    rerender(<BifrostStatus />);

    expect(screen.getByText('Source checks failing')).toBeInTheDocument();
    expect(screen.getByText('Current data may be unavailable')).toBeInTheDocument();
  });

  it('does not hide a known degraded source behind another source that is still pending', () => {
    mocks.apiHealth = {
      midgard: 'unknown',
      thornode: 'degraded',
    };

    const { rerender } = render(<BifrostStatus />);

    expect(screen.getByText('Source checks degraded')).toBeInTheDocument();
    expect(screen.getByText('One recent check is retrying')).toBeInTheDocument();
    expect(screen.queryByText('Source checks pending')).not.toBeInTheDocument();

    mocks.apiHealth = {
      midgard: 'degraded',
      thornode: 'unknown',
    };

    rerender(<BifrostStatus />);

    expect(screen.getByText('Source checks degraded')).toBeInTheDocument();
    expect(screen.queryByText('Source checks pending')).not.toBeInTheDocument();
  });

  it('labels explicit mock-data builds as demo data', () => {
    mocks.apiHealth = {
      midgard: 'mock',
      thornode: 'mock',
    };

    render(<BifrostStatus />);

    expect(screen.getByText('Demo data')).toBeInTheDocument();
    expect(screen.getByText('Local mock fixtures are not live source checks')).toBeInTheDocument();
  });
});
