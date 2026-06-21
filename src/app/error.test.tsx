import { render, screen } from '@/test/utils';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './error';

describe('ErrorBoundary', () => {
  it('uses source-scoped recovery copy instead of live-dashboard wording', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ErrorBoundary error={new Error('render failed')} reset={vi.fn()} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/other dashboard views use separate source checks/i)).toBeInTheDocument();
    expect(screen.queryByText(/live dashboards are independent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/source-backed dashboard views/i)).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
