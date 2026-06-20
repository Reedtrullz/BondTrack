import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { BondPosition, YieldGuardFlag } from '@/lib/types/node';
import { getAlertPositionSnapshotStorageKey } from '@/lib/storage/keys';
import { useBondPositionAlerts } from '../use-bond-position-alerts';
import { useBondPositions } from '../use-bond-positions';

vi.mock('../use-bond-positions', () => ({
  useBondPositions: vi.fn(),
}));

const ADDRESS = 'thor1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const NODE_ADDRESS = 'thor1nodealertsaaaaaaaaaaaaaaaaaaaaaaaaaaa';

type AlertPosition = BondPosition & { yieldGuardFlags: YieldGuardFlag[] };

function makePosition(overrides: Partial<AlertPosition> = {}): AlertPosition {
  return {
    nodeAddress: NODE_ADDRESS,
    nodeOperatorAddress: 'thor1operatoralertsaaaaaaaaaaaaaaaaaaaaaa',
    bondAmount: 10000,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 2000,
    operatorFeeFormatted: '20%',
    netAPY: 5,
    totalBond: 20000,
    slashPoints: 4,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '2.3.0',
    requestedToLeave: false,
    yieldGuardFlags: [],
    ...overrides,
  };
}

function makeChecks() {
  return {
    triggerAlert: vi.fn(),
  };
}

describe('useBondPositionAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('snapshots the initial load without triggering alerts', async () => {
    const checks = makeChecks();
    vi.mocked(useBondPositions).mockReturnValue({
      positions: [makePosition()],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    renderHook(() => useBondPositionAlerts(ADDRESS, checks));

    await waitFor(() => expect(useBondPositions).toHaveBeenCalledWith(ADDRESS));
    expect(checks.triggerAlert).not.toHaveBeenCalled();
  });

  it('emits slash, jail, status, and newly entered churn risk alerts after the first snapshot', async () => {
    const checks = makeChecks();
    let positions = [makePosition()];
    vi.mocked(useBondPositions).mockImplementation(() => ({
      positions,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    }));

    const { rerender } = renderHook(() => useBondPositionAlerts(ADDRESS, checks));
    await waitFor(() => expect(useBondPositions).toHaveBeenCalledWith(ADDRESS));

    positions = [
      makePosition({
        slashPoints: 12,
        isJailed: true,
        jailReleaseHeight: 123456,
        jailReason: 'missed observation',
        status: 'Standby',
        yieldGuardFlags: ['lowest_bond'],
      }),
    ];
    rerender();

    await waitFor(() => {
      expect(checks.triggerAlert).toHaveBeenCalledTimes(4);
    });
    expect(checks.triggerAlert).toHaveBeenCalledWith(
      'SLASH_INCREASE',
      NODE_ADDRESS,
      expect.stringContaining('slash points increased by 8 to 12')
    );
    expect(checks.triggerAlert).toHaveBeenCalledWith(
      'JAIL',
      NODE_ADDRESS,
      expect.stringContaining('entered jail: missed observation')
    );
    expect(checks.triggerAlert).toHaveBeenCalledWith(
      'NODE_STATUS_CHANGE',
      NODE_ADDRESS,
      expect.stringContaining('status changed from Active to Standby')
    );
    expect(checks.triggerAlert).toHaveBeenCalledWith(
      'CHURN_RISK',
      NODE_ADDRESS,
      expect.stringContaining('entered the low-bond churn risk set')
    );
  });

  it('does not alert while data is still loading', () => {
    const checks = makeChecks();
    vi.mocked(useBondPositions).mockReturnValue({
      positions: [makePosition({ slashPoints: 99, yieldGuardFlags: ['lowest_bond'] })],
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    });

    renderHook(() => useBondPositionAlerts(ADDRESS, checks));

    expect(checks.triggerAlert).not.toHaveBeenCalled();
  });

  it('starts a fresh silent snapshot when the watched address changes', async () => {
    const checks = makeChecks();
    let address = ADDRESS;
    let positions = [makePosition({ slashPoints: 4 })];
    vi.mocked(useBondPositions).mockImplementation(() => ({
      positions,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    }));

    const { rerender } = renderHook(() => useBondPositionAlerts(address, checks));
    await waitFor(() => expect(useBondPositions).toHaveBeenCalledWith(ADDRESS));

    address = 'thor1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    positions = [makePosition({ slashPoints: 100, yieldGuardFlags: ['lowest_bond'] })];
    rerender();

    await waitFor(() => expect(useBondPositions).toHaveBeenCalledWith(address));
    expect(checks.triggerAlert).not.toHaveBeenCalled();
  });

  it('compares against the persisted snapshot after a reload', async () => {
    const checks = makeChecks();
    const snapshotKey = getAlertPositionSnapshotStorageKey(ADDRESS);
    expect(snapshotKey).toBeTruthy();
    localStorage.setItem(snapshotKey!, JSON.stringify({
      updatedAt: Date.now() - 60_000,
      positions: [makePosition({ slashPoints: 4 })],
    }));

    vi.mocked(useBondPositions).mockReturnValue({
      positions: [makePosition({ slashPoints: 12 })],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    renderHook(() => useBondPositionAlerts(ADDRESS, checks));

    await waitFor(() => {
      expect(checks.triggerAlert).toHaveBeenCalledWith(
        'SLASH_INCREASE',
        NODE_ADDRESS,
        expect.stringContaining('slash points increased by 8 to 12')
      );
    });
    expect(localStorage.getItem(snapshotKey!)).toContain('"slashPoints":12');
  });

  it('does not overwrite the persisted snapshot while source data is degraded', () => {
    const checks = makeChecks();
    const snapshotKey = getAlertPositionSnapshotStorageKey(ADDRESS);
    expect(snapshotKey).toBeTruthy();
    localStorage.setItem(snapshotKey!, JSON.stringify({
      updatedAt: Date.now() - 60_000,
      positions: [makePosition({ slashPoints: 4 })],
    }));

    vi.mocked(useBondPositions).mockReturnValue({
      positions: [makePosition({ slashPoints: 99 })],
      isLoading: false,
      error: new Error('THORNode degraded'),
      mutate: vi.fn(),
    });

    renderHook(() => useBondPositionAlerts(ADDRESS, checks));

    expect(checks.triggerAlert).not.toHaveBeenCalled();
    expect(localStorage.getItem(snapshotKey!)).toContain('"slashPoints":4');
  });
});
