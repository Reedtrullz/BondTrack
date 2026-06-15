import { render, screen, within } from '@/test/utils';
import { describe, expect, it } from 'vitest';
import { ChartDataTable } from './chart-data-table';

describe('ChartDataTable', () => {
  it('exposes chart data with table semantics without native table layout overflow', () => {
    const { container } = render(
      <ChartDataTable
        caption="Risk radar metrics for thor1mocknode"
        columns={['Metric', 'Score']}
        rows={[
          ['Uptime', '99 / 100'],
          ['Security', '100 / 100'],
        ]}
      />
    );

    const table = screen.getByRole('table', { name: 'Risk radar metrics for thor1mocknode' });

    expect(table.tagName).toBe('DIV');
    expect(container.querySelector('table')).not.toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Metric' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Score' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Uptime' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '99 / 100' })).toBeInTheDocument();
  });
});
