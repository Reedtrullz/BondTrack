import { render, screen } from '@/test/utils';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './error';

describe('ErrorBoundary', () => {
  it('uses source-scoped recovery copy instead of live-dashboard wording', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ErrorBoundary error={new Error('render failed')} reset={vi.fn()} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/source-backed dashboard views are independent/i)).toBeInTheDocument();
    expect(screen.queryByText(/live dashboards are independent/i)).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
