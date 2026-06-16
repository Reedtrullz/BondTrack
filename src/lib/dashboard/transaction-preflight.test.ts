import { describe, expect, it } from 'vitest';
import type { BondPosition } from '@/lib/types/node';
import { buildTransactionPreflightModel, parseTransactionAction } from './transaction-preflight';
import type { TransactionSourceInput } from './transaction-preflight';

const healthySource: TransactionSourceInput = {
  positionsError: false,
  positionsLoading: false,
  thornodeStatus: 'healthy',
};
const dashboardAddress = 'thor1p5xs6rgdp5xs6rgdp5xs6rgdp5xs6rgd2gv5hv';
const walletAddress = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';

function position(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    bondAmount: 25,
    bondSharePercent: 100,
    isJailed: false,
    jailReleaseHeight: 0,
    netAPY: 0,
    nodeAddress: 'thor1node000000000000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
    operatorFee: 0,
    operatorFeeFormatted: '0 bps',
    requestedToLeave: false,
    slashPoints: 0,
    status: 'Active',
    totalBond: 25,
    version: '3.19.0',
    yieldGuardFlags: [],
    ...overrides,
  };
}

describe('parseTransactionAction', () => {
  it('defaults unknown or missing actions to BOND mode', () => {
    expect(parseTransactionAction(null)).toBe('bond');
    expect(parseTransactionAction('')).toBe('bond');
    expect(parseTransactionAction('withdraw')).toBe('bond');
    expect(parseTransactionAction('UNBOND')).toBe('unbond');
  });
});

describe('buildTransactionPreflightModel', () => {
  it('shows memo-first BOND guidance when no wallet or dashboard address is selected', () => {
    const model = buildTransactionPreflightModel({
      actionParam: null,
      dashboardAddress: null,
      positions: [],
      source: healthySource,
      wallet: {
        address: null,
        isConnected: false,
        isNetworkMismatch: false,
        networkMismatch: { actual: null, expected: 'thorchain-1', hasMismatch: false },
        walletType: null,
      },
    });

    expect(model.action).toBe('bond');
    expect(model.eligibleUnbondPositions).toHaveLength(0);
    expect(model.severity).toBe('info');
    expect(model.status).toBe('Prepare memo first');
    expect(model.detail).toBe('Memo copy can be prepared without a wallet. Connect only when you are ready to preview and broadcast.');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mode', value: 'BOND', detail: 'Adds RUNE with a THORChain MsgDeposit memo.', severity: 'ready' }),
      expect.objectContaining({
        id: 'wallet',
        value: 'Not connected',
        detail: 'Required for preview and broadcast; memo copy does not require a wallet once source confidence is fresh.',
        severity: 'info',
      }),
      expect.objectContaining({ id: 'dashboard-address', value: 'Not selected', detail: 'No watched address is selected for context.', severity: 'warning' }),
      expect.objectContaining({ id: 'eligibility', label: 'Node target', value: 'Manual node entry', severity: 'ready' }),
    ]));
  });

  it('prioritizes wrong-network warnings over otherwise actionable UNBOND state', () => {
    const model = buildTransactionPreflightModel({
      actionParam: 'unbond',
      dashboardAddress,
      positions: [position({ status: 'Standby' })],
      source: healthySource,
      wallet: {
        address: walletAddress,
        isConnected: true,
        isNetworkMismatch: true,
        networkMismatch: { actual: 'cosmoshub-4', expected: 'thorchain-1', hasMismatch: true },
        walletType: 'keplr',
      },
    });

    expect(model.eligibleUnbondPositions).toHaveLength(1);
    expect(model.severity).toBe('critical');
    expect(model.status).toBe('Wrong network');
    expect(model.detail).toBe('Wallet reports cosmoshub-4; THORChain mainnet expects thorchain-1.');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'wallet', value: 'Network mismatch', detail: 'Switch to thorchain-1 before broadcast.', severity: 'critical' }),
      expect.objectContaining({ id: 'mode', value: 'UNBOND', severity: 'ready' }),
      expect.objectContaining({ id: 'eligibility', value: '1 standby', severity: 'ready' }),
    ]));
  });

  it('keeps a wrong-network connection attempt critical even when the wallet is not usable', () => {
    const model = buildTransactionPreflightModel({
      actionParam: 'bond',
      dashboardAddress,
      positions: [],
      source: healthySource,
      wallet: {
        address: walletAddress,
        isConnected: false,
        isNetworkMismatch: true,
        networkMismatch: { actual: 'cosmoshub-4', expected: 'thorchain-1', hasMismatch: true },
        walletType: 'keplr',
      },
    });

    expect(model.severity).toBe('critical');
    expect(model.status).toBe('Wrong network');
    expect(model.detail).toBe('Wallet reports cosmoshub-4; THORChain mainnet expects thorchain-1.');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'wallet', value: 'Network mismatch', detail: 'Switch to thorchain-1 before broadcast.', severity: 'critical' }),
    ]));
  });

  it('warns clearly when UNBOND has no eligible standby node', () => {
    const model = buildTransactionPreflightModel({
      actionParam: 'unbond',
      dashboardAddress,
      positions: [position({ status: 'Active' })],
      source: healthySource,
      wallet: {
        address: null,
        isConnected: false,
        isNetworkMismatch: false,
        networkMismatch: { actual: null, expected: 'thorchain-1', hasMismatch: false },
        walletType: null,
      },
    });

    expect(model.severity).toBe('warning');
    expect(model.status).toBe('No eligible standby node');
    expect(model.detail).toBe('UNBOND can only proceed from a standby node. Review node status before signing.');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mode', value: 'UNBOND', detail: 'Uses a zero-RUNE deposit; amount is encoded in memo base units.', severity: 'warning' }),
      expect.objectContaining({ id: 'eligibility', label: 'UNBOND eligibility', value: '0 standby', detail: 'No standby node is available from this watched address.', severity: 'warning' }),
    ]));
  });

  it('marks connected eligible transactions ready while keeping wallet and dashboard addresses separate', () => {
    const model = buildTransactionPreflightModel({
      actionParam: 'unbond',
      dashboardAddress,
      positions: [position({ status: 'Standby' })],
      source: healthySource,
      wallet: {
        address: walletAddress,
        isConnected: true,
        isNetworkMismatch: false,
        networkMismatch: { actual: 'thorchain-1', expected: 'thorchain-1', hasMismatch: false },
        walletType: 'vultisig',
      },
    });

    expect(model.severity).toBe('ready');
    expect(model.status).toBe('Ready to preview');
    expect(model.detail).toBe('Wallet is connected; Heimdall still shows a preview before broadcast.');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'wallet', value: 'thor1qgpqy...9s7qn4', detail: 'VULTISIG connected for preview.', severity: 'ready' }),
      expect.objectContaining({ id: 'dashboard-address', value: 'thor1p5xs6...2gv5hv', detail: 'Used only for watched positions and history context.', severity: 'ready' }),
      expect.objectContaining({ id: 'eligibility', value: '1 standby', detail: 'Only standby nodes can be selected for UNBOND.', severity: 'ready' }),
    ]));
  });

  it('does not mark connected BOND previews or memo copy ready while THORNode confidence is degraded', () => {
    const model = buildTransactionPreflightModel({
      actionParam: 'bond',
      dashboardAddress,
      positions: [],
      source: {
        positionsError: false,
        positionsLoading: false,
        thornodeStatus: 'degraded',
      },
      wallet: {
        address: walletAddress,
        isConnected: true,
        isNetworkMismatch: false,
        networkMismatch: { actual: 'thorchain-1', expected: 'thorchain-1', hasMismatch: false },
        walletType: 'keplr',
      },
    });

    expect(model.severity).toBe('warning');
    expect(model.status).toBe('Source confidence degraded');
    expect(model.detail).toBe('THORNode source confidence is degraded. Do not copy, preview, or broadcast until source confidence is fresh.');
    expect(model.source.canCopyBondMemo).toBe(false);
    expect(model.source.canPreview).toBe(false);
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source',
        value: 'THORNode degraded',
        severity: 'warning',
      }),
      expect.objectContaining({
        id: 'eligibility',
        label: 'Node target',
        value: 'Source unavailable',
        detail: 'THORNode must be fresh before Heimdall allows BOND memo copy, preview, or broadcast.',
        severity: 'warning',
      }),
    ]));
  });

  it.each([
    {
      name: 'loading',
      source: { positionsError: false, positionsLoading: true, thornodeStatus: 'healthy' as const },
      status: 'Checking source confidence',
      detail: 'Waiting for THORNode positions before copying, previewing, or broadcasting a transaction.',
    },
    {
      name: 'positions error',
      source: { positionsError: true, positionsLoading: false, thornodeStatus: 'healthy' as const },
      status: 'Eligibility unavailable',
      detail: 'THORNode positions failed to load. Do not copy, preview, or broadcast until source confidence is fresh.',
    },
    {
      name: 'unknown',
      source: { positionsError: false, positionsLoading: false, thornodeStatus: 'unknown' as const },
      status: 'Source confidence pending',
      detail: 'THORNode source confidence has not completed yet. Wait for a fresh source check before copying, preview, or broadcast.',
    },
    {
      name: 'down',
      source: { positionsError: false, positionsLoading: false, thornodeStatus: 'down' as const },
      status: 'Source confidence degraded',
      detail: 'THORNode source confidence is degraded. Do not copy, preview, or broadcast until source confidence is fresh.',
    },
  ])('keeps BOND memo copy fail-closed when THORNode source is $name', ({ source, status, detail }) => {
    const model = buildTransactionPreflightModel({
      actionParam: 'bond',
      dashboardAddress,
      positions: [],
      source,
      wallet: {
        address: null,
        isConnected: false,
        isNetworkMismatch: false,
        networkMismatch: { actual: null, expected: 'thorchain-1', hasMismatch: false },
        walletType: null,
      },
    });

    expect(model.status).toBe(status);
    expect(model.detail).toBe(detail);
    expect(model.source.canCopyBondMemo).toBe(false);
    expect(model.source.canPreview).toBe(false);
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'eligibility',
        label: 'Node target',
        value: 'Source unavailable',
        detail: 'THORNode must be fresh before Heimdall allows BOND memo copy, preview, or broadcast.',
        severity: source.positionsLoading || source.thornodeStatus === 'unknown' ? 'info' : 'warning',
      }),
    ]));
  });

  it('treats UNBOND eligibility as unavailable when THORNode positions fail', () => {
    const model = buildTransactionPreflightModel({
      actionParam: 'unbond',
      dashboardAddress,
      positions: [],
      source: {
        positionsError: true,
        positionsLoading: false,
        thornodeStatus: 'degraded',
      },
      wallet: {
        address: walletAddress,
        isConnected: true,
        isNetworkMismatch: false,
        networkMismatch: { actual: 'thorchain-1', expected: 'thorchain-1', hasMismatch: false },
        walletType: 'keplr',
      },
    });

    expect(model.severity).toBe('warning');
    expect(model.status).toBe('Eligibility unavailable');
    expect(model.detail).toBe('THORNode positions failed to load. Do not copy, preview, or broadcast until source confidence is fresh.');
    expect(model.source.canCopyBondMemo).toBe(false);
    expect(model.source.canCopyUnbondMemo).toBe(false);
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'eligibility',
        label: 'UNBOND eligibility',
        value: 'Source unavailable',
        detail: 'THORNode must be fresh before Heimdall can prove standby eligibility.',
        severity: 'warning',
      }),
    ]));
    expect(model.items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'eligibility', value: '0 standby' }),
    ]));
  });
});
