import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExportButton } from './export-button';
import type { BondPosition } from '@/lib/types/node';

const mocks = vi.hoisted(() => ({
  downloadBondCsv: vi.fn(),
}));

vi.mock('@/lib/utils/bond-export', () => ({
  downloadBondCsv: mocks.downloadBondCsv,
}));

const position: BondPosition = {
  nodeAddress: 'thor1nodeexport000000000000000000000000000',
  nodeOperatorAddress: 'thor1operatorexport000000000000000000000',
  bondAmount: 1234.56,
  bondSharePercent: 12.5,
  status: 'Active',
  operatorFee: 2000,
  operatorFeeFormatted: '20.00%',
  netAPY: 4.2,
  totalBond: 9876.54,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '2.135.0',
  requestedToLeave: false,
};

describe('ExportButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.downloadBondCsv.mockReset();
  });

  it('shows an inline failure instead of logging a hidden bond CSV export error', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.downloadBondCsv.mockImplementation(() => {
      throw new Error('blob unavailable');
    });

    render(<ExportButton bondPositions={[position]} />);

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(mocks.downloadBondCsv).toHaveBeenCalledWith([position]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bond CSV export failed. No file was downloaded. Try again after source data is available.'
    );
  });
});
