import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlashMonitor } from './slash-monitor';
import type { BondPosition } from '@/lib/types/node';

const mockUseCurrentBlockHeight = vi.fn();

vi.mock('@/lib/hooks/use-current-block-height', () => ({
  useCurrentBlockHeight: () => mockUseCurrentBlockHeight(),
}));

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1slashnode000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator0000000000000000000000000000',
    bondAmount: 12_500,
    bondSharePercent: 100,
    status: 'Active',
    operatorFee: 500,
    operatorFeeFormatted: '5.0%',
    netAPY: 12.5,
    totalBond: 12_500,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '3.19.0',
    requestedToLeave: false,
    ...overrides,
  };
}

describe('SlashMonitor', () => {
  beforeEach(() => {
    mockUseCurrentBlockHeight.mockReturnValue({ currentBlockHeight: 12_345_678 });
  });

  function getSummaryTile(label: string): HTMLElement {
    const tile = screen
      .getAllByText(label)
      .map((element) => element.parentElement)
      .find((element): element is HTMLElement => Boolean(element?.className.includes('text-center')));

    if (!tile) {
      throw new Error(`Missing summary tile for ${label}`);
    }

    return tile;
  }

  it('frames zero slash as a current source reading instead of a clean-record verdict', () => {
    render(<SlashMonitor positions={[position()]} />);

    expect(screen.getByText('No current slash points visible')).toBeInTheDocument();
    expect(screen.getByText(/Current THORNode data reports zero slash points/)).toBeInTheDocument();
    expect(screen.queryByText('No slash points on your nodes')).not.toBeInTheDocument();
    expect(screen.queryByText(/clean record/i)).not.toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('labels minor nonzero slash exposure as monitor instead of OK', () => {
    render(<SlashMonitor positions={[position({ slashPoints: 5 })]} />);

    const monitor = screen.getByText('Monitor');
    expect(monitor).toBeInTheDocument();
    expect(monitor).toHaveClass('text-sky-600');
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
    expect(screen.getByText(/Severity: Monitor/)).toBeInTheDocument();

    const row = monitor.closest('div');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('5')).toBeInTheDocument();
  });

  it('treats a jailed summary as critical instead of green success', () => {
    render(
      <SlashMonitor
        positions={[
          position({
            slashPoints: 250,
            isJailed: true,
            jailReleaseHeight: 12_346_078,
            jailReason: 'slash points',
          }),
        ]}
      />
    );

    const jailedTile = getSummaryTile('Jailed');
    expect(within(jailedTile).getByText('1')).toBeInTheDocument();
    expect(jailedTile).toHaveClass('bg-red-50');
    expect(jailedTile).not.toHaveClass('bg-emerald-50');
    expect(within(jailedTile).getByText('Jailed')).toHaveClass('text-red-600');

    expect(screen.getByText('40m').parentElement).toHaveClass('text-red-500');
  });

  it('keeps a zero jailed summary neutral rather than green success', () => {
    render(<SlashMonitor positions={[position({ slashPoints: 5 })]} />);

    const jailedTile = getSummaryTile('Jailed');
    expect(within(jailedTile).getByText('0')).toBeInTheDocument();
    expect(jailedTile).toHaveClass('bg-zinc-100');
    expect(jailedTile).not.toHaveClass('bg-emerald-50');
    expect(jailedTile).not.toHaveClass('bg-red-50');
  });
});
