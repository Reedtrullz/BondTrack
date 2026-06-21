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
    expect(model.status).toBe('Review memo first');
    expect(model.detail).toBe('Review and copy the memo without connecting a wallet. Connect only for preview and broadcast.');
    expect(model.detail).not.toContain('available');
    expect(model.detail).not.toContain('when you are ready');
    expect(model.primaryAction).toEqual({ href: '#transaction-composer', label: 'Open composer' });
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mode', value: 'BOND', detail: 'Adds RUNE with a THORChain MsgDeposit memo.', severity: 'info' }),
      expect.objectContaining({
        id: 'source',
        value: 'THORNode responding',
        detail: 'THORNode positions responded for node status and unbond eligibility. Source availability is not transaction approval; wallet still presents the final payload and fee.',
        severity: 'checked',
      }),
      expect.objectContaining({
        id: 'wallet',
        value: 'Not connected',
        detail: 'Required for preview and broadcast; memo copy stays local once THORNode positions respond.',
        severity: 'info',
      }),
      expect.objectContaining({ id: 'dashboard-address', value: 'Not selected', detail: 'No watched address is selected for context.', severity: 'warning' }),
      expect.objectContaining({ id: 'eligibility', label: 'Node target', value: 'Manual node entry', severity: 'info' }),
    ]));
  });

  it('uses checked or informational severity instead of ready states for successful prerequisites', () => {
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
        walletType: 'keplr',
      },
    });

    expect(model.items.map((item) => item.severity)).not.toContain('ready');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'source', severity: 'checked' }),
      expect.objectContaining({ id: 'wallet', severity: 'checked' }),
      expect.objectContaining({ id: 'dashboard-address', severity: 'checked' }),
      expect.objectContaining({ id: 'eligibility', severity: 'checked' }),
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
      expect.objectContaining({ id: 'mode', value: 'UNBOND', severity: 'checked' }),
      expect.objectContaining({ id: 'eligibility', value: '1 standby', severity: 'checked' }),
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

  it('frames connected eligible transactions as review before broadcast while keeping wallet and dashboard addresses separate', () => {
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

    expect(model.severity).toBe('info');
    expect(model.status).toBe('Review before broadcast');
    expect(model.detail).toBe('Wallet is connected. Review the memo here, then approve only if the wallet presents payload, memo, amount, and network fee that match.');
    expect(model.detail).not.toContain('preview is available');
    expect(model.detail).not.toMatch(/wallet payload, memo, amount, and network fee match/i);
    expect(model.status).not.toBe('Ready to preview');
    expect(model.source.status).toBe('Source responding');
    expect(model.source.status).not.toBe('Source check passed');
    expect(model.source.status).not.toBe('Source verified');
    expect(model.source.value).toBe('THORNode responding');
    expect(model.source.value).not.toBe('THORNode available');
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'wallet',
        value: 'thor1qgpqy...9s7qn4',
        detail: 'VULTISIG connected; wallet must present final payload before approval.',
        severity: 'checked',
      }),
      expect.objectContaining({ id: 'dashboard-address', value: 'thor1p5xs6...2gv5hv', detail: 'Used only for watched positions and history context.', severity: 'checked' }),
      expect.objectContaining({ id: 'eligibility', value: '1 standby', detail: 'Only standby nodes can be selected for UNBOND.', severity: 'checked' }),
    ]));
  });

  it('does not mark connected BOND previews or memo copy ready while THORNode source checks are degraded', () => {
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
    expect(model.status).toBe('Source check degraded');
    expect(model.detail).toBe('THORNode source check is degraded. Do not copy, preview, or broadcast until THORNode positions respond again.');
    expect(model.detail).not.toMatch(/fresh/i);
    expect(model.source.canCopyBondMemo).toBe(false);
    expect(model.source.canPreview).toBe(false);
    expect(model.primaryAction).toEqual({ href: '#transaction-source-confidence', label: 'Review source checks' });
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source',
        label: 'Source checks',
        value: 'THORNode degraded',
        severity: 'warning',
      }),
      expect.objectContaining({
        id: 'eligibility',
        label: 'Node target',
        value: 'Source unavailable',
        detail: 'Current THORNode positions must respond before Heimdall allows BOND memo copy, preview, or broadcast.',
        severity: 'warning',
      }),
    ]));
  });

  it.each([
    {
      name: 'loading',
      source: { positionsError: false, positionsLoading: true, thornodeStatus: 'healthy' as const },
      status: 'Checking source',
      detail: 'Waiting for THORNode positions before copying, previewing, or broadcasting a transaction.',
    },
    {
      name: 'positions error',
      source: { positionsError: true, positionsLoading: false, thornodeStatus: 'healthy' as const },
      status: 'Eligibility unavailable',
      detail: 'THORNode positions failed to load. Do not copy, preview, or broadcast until THORNode positions respond again.',
    },
    {
      name: 'unknown',
      source: { positionsError: false, positionsLoading: false, thornodeStatus: 'unknown' as const },
      status: 'Source check pending',
      detail: 'THORNode source check has not completed yet. Wait for current THORNode positions before copying, preview, or broadcast.',
    },
    {
      name: 'down',
      source: { positionsError: false, positionsLoading: false, thornodeStatus: 'down' as const },
      status: 'Source check degraded',
      detail: 'THORNode source check is degraded. Do not copy, preview, or broadcast until THORNode positions respond again.',
    },
    {
      name: 'mock',
      source: { positionsError: false, positionsLoading: false, thornodeStatus: 'mock' as const },
      status: 'Demo data only',
      detail: 'Local mock data is enabled. Do not copy, preview, or broadcast BOND or UNBOND transactions from demo data.',
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
    expect(model.detail).not.toMatch(/fresh/i);
    expect(model.source.canCopyBondMemo).toBe(false);
    expect(model.source.canPreview).toBe(false);
    expect(model.primaryAction).toEqual({ href: '#transaction-source-confidence', label: 'Review source checks' });
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source',
        label: 'Source checks',
      }),
      expect.objectContaining({
        id: 'eligibility',
        label: 'Node target',
        value: 'Source unavailable',
        detail: 'Current THORNode positions must respond before Heimdall allows BOND memo copy, preview, or broadcast.',
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
    expect(model.detail).toBe('THORNode positions failed to load. Do not copy, preview, or broadcast until THORNode positions respond again.');
    expect(model.detail).not.toMatch(/fresh/i);
    expect(model.source.canCopyBondMemo).toBe(false);
    expect(model.source.canCopyUnbondMemo).toBe(false);
    expect(model.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'eligibility',
        label: 'UNBOND eligibility',
        value: 'Source unavailable',
        detail: 'THORNode positions must respond before Heimdall can check standby eligibility.',
        severity: 'warning',
      }),
    ]));
    expect(model.items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'eligibility', value: '0 standby' }),
    ]));
  });
});
