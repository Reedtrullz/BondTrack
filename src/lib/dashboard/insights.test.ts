import { describe, expect, it } from 'vitest';
import {
  buildDashboardInsightState,
  buildSourceFreshness,
  dedupeActionItems,
  formatFreshnessAge,
  rankActionItems,
  resolveThornodeGatedBondAction,
  type ActionItem,
} from './insights';
import type { NetworkRaw } from '@/lib/api/midgard';
import type { ApiHealthState } from '@/lib/hooks/use-api-health';
import type { BondPosition } from '@/lib/types/node';
import type { LpPosition } from '@/lib/types/lp';

const NOW = new Date('2026-06-12T12:00:00.000Z');

function action(overrides: Partial<ActionItem>): ActionItem {
  return {
    id: 'action',
    severity: 'info',
    source: 'Node',
    title: 'Action',
    detail: 'Detail',
    impact: 'Impact',
    href: '/dashboard/risk',
    lastSeen: NOW,
    ...overrides,
  };
}

function apiHealth(overrides: Partial<ApiHealthState> = {}): ApiHealthState {
  return {
    midgard: 'healthy',
    thornode: 'healthy',
    lastChecked: NOW,
    lastSuccessful: {
      midgard: NOW,
      thornode: NOW,
    },
    ...overrides,
  };
}

function bondPosition(overrides: Partial<BondPosition> = {}): BondPosition {
  return {
    nodeAddress: 'thor1node0000000000000000000000000000000000000',
    nodeOperatorAddress: 'thor1operator0000000000000000000000000000000',
    bondAmount: 12_500,
    bondSharePercent: 50,
    status: 'Active',
    operatorFee: 2000,
    operatorFeeFormatted: '20.0%',
    netAPY: 12.5,
    totalBond: 25_000,
    slashPoints: 0,
    isJailed: false,
    jailReleaseHeight: 0,
    version: '2.3.0',
    requestedToLeave: false,
    yieldGuardFlags: [],
    ...overrides,
  };
}

function lpPosition(overrides: Partial<LpPosition> = {}): LpPosition {
  return {
    address: 'thor1lpaddress',
    pool: 'BTC.BTC',
    assetSymbol: 'BTC',
    runeDeposit: '100',
    asset2Deposit: '1',
    liquidityUnits: '1000',
    runeAdded: '100',
    runePending: '0',
    runeWithdrawn: '0',
    asset2Added: '1',
    asset2Pending: '0',
    asset2Withdrawn: '0',
    volume24h: '0',
    runeDepth: '1000',
    asset2Depth: '10',
    dateFirstAdded: '2026-01-01T00:00:00.000Z',
    dateLastAdded: '2026-01-01T00:00:00.000Z',
    poolApy: 0,
    poolStatus: 'available',
    ownershipPercent: 1,
    hasPending: false,
    runeDepositedValue: '100',
    asset2DepositedValue: '1',
    runeWithdrawable: '100',
    asset2Withdrawable: '1',
    redeemQuoteSource: 'thornode',
    claimableTrusted: true,
    currentRunePriceUsd: 1,
    currentAssetPriceUsd: 100,
    entryRunePriceUsd: null,
    entryAssetPriceUsd: null,
    currentTotalValueUsd: 200,
    depositedTotalValueUsd: null,
    netProfitLoss: '0',
    netProfitLossUsd: null,
    netProfitLossPercent: null,
    hodlValueUsd: null,
    impermanentLossUsd: null,
    impermanentLossPercent: null,
    impermanentLossValue: null,
    pricingSource: 'historical',
    runeEntryPrice: null,
    asset2EntryPrice: null,
    ...overrides,
  };
}

function network(overrides: Partial<NetworkRaw> = {}): NetworkRaw {
  return {
    activeBonds: [],
    activeNodeCount: '0',
    standbyBonds: [],
    standbyNodeCount: '0',
    totalPooledRune: '0',
    totalReserve: '0',
    bondMetrics: {
      totalActiveBond: '9600000000000000',
      totalStandbyBond: '39021221000000',
      averageActiveBond: '0',
      averageStandbyBond: '0',
      medianActiveBond: '0',
      minimumActiveBond: '0',
      maximumActiveBond: '0',
      bondHardCap: '0',
    },
    bondingAPY: '0',
    liquidityAPY: '0',
    blockRewards: {
      blockReward: '0',
      bondReward: '0',
      poolReward: '0',
    },
    nextChurnHeight: '0',
    poolActivationCountdown: '0',
    ...overrides,
  };
}

describe('dashboard insights', () => {
  it('ranks action items by deterministic severity and recency order', () => {
    const ranked = rankActionItems([
      action({ id: 'info', severity: 'info', lastSeen: new Date('2026-06-12T10:00:00Z') }),
      action({ id: 'critical-old', severity: 'critical', lastSeen: new Date('2026-06-12T09:00:00Z') }),
      action({ id: 'critical-new', severity: 'critical', lastSeen: new Date('2026-06-12T11:00:00Z') }),
      action({ id: 'warning', severity: 'warning', lastSeen: new Date('2026-06-12T11:30:00Z') }),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(['critical-new', 'critical-old', 'warning', 'info']);
  });

  it('dedupes related actions by stable id', () => {
    const deduped = dedupeActionItems([
      action({ id: 'slash:thor1node' }),
      action({ id: 'slash:thor1node', title: 'Duplicate slash' }),
      action({ id: 'jail:thor1node' }),
    ]);

    expect(deduped.map((item) => item.id)).toEqual(['slash:thor1node', 'jail:thor1node']);
  });

  it('clamps negative freshness age to just now', () => {
    const futureSuccess = new Date('2026-06-12T12:05:00.000Z');

    expect(formatFreshnessAge(futureSuccess, NOW)).toBe('just now');
  });

  it('labels stale and degraded sources clearly', () => {
    const sources = buildSourceFreshness(
      apiHealth({
        midgard: 'degraded',
        thornode: 'healthy',
      }),
      {
        runePriceUpdatedAt: new Date('2026-06-12T09:00:00Z'),
        runePriceIsStale: true,
      }
    );

    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'Midgard', status: 'degraded' }),
      expect.objectContaining({ source: 'RUNE price', status: 'stale' }),
    ]));
  });

  it('describes failed source probes as current readings rather than live readings', () => {
    const sources = buildSourceFreshness(
      apiHealth({
        midgard: 'down',
        thornode: 'healthy',
      }),
      { includeRunePriceSource: false }
    );

    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'Midgard',
        detail: 'Multiple probes failed. Treat current readings as unreliable.',
      }),
    ]));
    expect(sources.map((source) => source.detail)).not.toContain('Multiple probes failed. Treat live readings as unreliable.');
  });

  it('does not call an old loaded RUNE price fresh when the stale flag is missing', () => {
    const sources = buildSourceFreshness(
      apiHealth(),
      {
        now: NOW,
        runePriceUpdatedAt: new Date('2026-06-10T23:00:00.000Z'),
        runePriceIsStale: false,
        runePriceStaleAfterMs: 36 * 60 * 60 * 1000,
      }
    );

    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'RUNE price',
        status: 'stale',
        detail: 'Price feed is stale; USD values use the last successful quote.',
      }),
    ]));
  });

  it('does not claim an unloaded RUNE price quote is available', () => {
    const sources = buildSourceFreshness(apiHealth());

    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'RUNE price',
        status: 'unknown',
        detail: 'No RUNE price quote has loaded yet; USD values are unavailable.',
      }),
    ]));
  });

  it('can omit RUNE price source confidence on pages that do not use USD values', () => {
    const sources = buildSourceFreshness(apiHealth(), { includeRunePriceSource: false });

    expect(sources.map((source) => source.source)).toEqual(['THORNode', 'Midgard']);
  });

  it('uses the fallback generic BOND action when THORNode confidence has no action', () => {
    const resolved = resolveThornodeGatedBondAction([
      action({
        id: 'source:midgard:degraded',
        source: 'Midgard',
        href: '/dashboard?address=thor1provider#source-confidence',
        primaryAction: 'Review source confidence',
      }),
    ], {
      label: 'Open BOND',
      href: '/dashboard/transactions?address=thor1provider&action=bond',
    });

    expect(resolved).toEqual({
      kind: 'bond-ready',
      label: 'Open BOND',
      href: '/dashboard/transactions?address=thor1provider&action=bond',
    });
  });

  it('routes the generic BOND action to THORNode source confidence when present', () => {
    const sourceAction = action({
      id: 'source:thornode:degraded',
      source: 'THORNode',
      href: '/dashboard?address=thor1provider#source-confidence',
      primaryAction: 'Review source confidence',
    });

    const resolved = resolveThornodeGatedBondAction([sourceAction], {
      label: 'Prepare BOND Memo',
      href: '/dashboard/transactions?address=thor1provider&action=bond',
    });

    expect(resolved).toEqual({
      kind: 'source-confidence',
      label: 'Review source confidence',
      href: '/dashboard?address=thor1provider#source-confidence',
      sourceAction,
    });
  });

  it('treats an empty bond portfolio as informational rather than healthy', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [],
      runePriceUpdatedAt: NOW,
    });

    expect(state.severity).toBe('info');
    expect(state.statusLabel).toBe('No Bond');
    expect(state.diagnosis).toBe('No active bond-provider position was found for this address. Start by confirming the address or preparing a BOND transaction.');
    expect(state.topRisk).toBe('No bonded positions detected');
    expect(state.primaryAction).toEqual({
      label: 'Open Bond Composer',
      href: '/dashboard/transactions?address=thor1provider',
    });
    expect(state.headerMetrics[0]).toEqual({
      label: 'Provider exposure',
      value: '--',
      detail: 'No bonded positions tracked',
    });
  });

  it('keeps no-bond pages focused on missing node positions when price confidence is irrelevant', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [],
      includeRunePriceSource: false,
    });

    expect(state.statusLabel).toBe('No Bond');
    expect(state.diagnosis).toBe('No active bond-provider position was found for this address. Start by confirming the address or preparing a BOND transaction.');
    expect(state.topRisk).toBe('No bonded positions detected');
    expect(state.actions.map((item) => item.title)).not.toContain('RUNE price is unknown');
    expect(state.sources.map((source) => source.source)).toEqual(['THORNode', 'Midgard']);
  });

  it('keeps no-bond as the headline state even while a source check is pending', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth({
        midgard: 'unknown',
        lastSuccessful: {
          midgard: null,
          thornode: NOW,
        },
      }),
      positions: [],
      runePriceUpdatedAt: NOW,
    });

    expect(state.statusLabel).toBe('No Bond');
    expect(state.diagnosis).toBe('No active bond-provider position was found for this address. Start by confirming the address or preparing a BOND transaction.');
    expect(state.topRisk).toBe('No bonded positions detected');
    expect(state.primaryAction).toEqual({
      label: 'Open Bond Composer',
      href: '/dashboard/transactions?address=thor1provider',
    });
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source:midgard:unknown',
        severity: 'warning',
      }),
    ]));
  });

  it('routes no-bond BOND entry to source confidence when THORNode confidence is degraded', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth({
        thornode: 'degraded',
        lastSuccessful: {
          midgard: NOW,
          thornode: null,
        },
      }),
      positions: [],
      runePriceUpdatedAt: NOW,
    });

    expect(state.statusLabel).toBe('No Bond');
    expect(state.diagnosis).toBe('No active bond-provider position was found for this address. Confirm the address, then wait for fresh THORNode source confidence before preparing a BOND transaction.');
    expect(state.topRisk).toBe('No bonded positions detected');
    expect(state.primaryAction).toEqual({
      label: 'Review source confidence',
      href: '/dashboard?address=thor1provider#source-confidence',
    });
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source:thornode:degraded',
        source: 'THORNode',
        primaryAction: 'Review source confidence',
      }),
    ]));
  });

  it.each(['down', 'unknown'] as const)('routes no-bond BOND entry to source confidence when THORNode confidence is %s', (thornode) => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth({
        thornode,
        lastSuccessful: {
          midgard: NOW,
          thornode: null,
        },
      }),
      positions: [],
      runePriceUpdatedAt: NOW,
    });

    expect(state.statusLabel).toBe('No Bond');
    expect(state.diagnosis).toBe('No active bond-provider position was found for this address. Confirm the address, then wait for fresh THORNode source confidence before preparing a BOND transaction.');
    expect(state.primaryAction).toEqual({
      label: 'Review source confidence',
      href: '/dashboard?address=thor1provider#source-confidence',
    });
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'THORNode',
        primaryAction: 'Review source confidence',
      }),
    ]));
  });

  it('uses compact RUNE values in the supporting metric strip', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [bondPosition()],
      network: network(),
    });

    expect(state.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'total-bond',
        value: 'ᚱ12.5K',
      }),
      expect.objectContaining({
        id: 'network-bond',
        value: 'ᚱ96.4M',
      }),
    ]));
  });

  it('describes a healthy bonded portfolio as current source responses, not absolute live safety', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [bondPosition()],
      runePriceUpdatedAt: NOW,
    });

    expect(state.statusLabel).toBe('Healthy');
    expect(state.diagnosis).toBe('Current source responses show no provider action needed.');
    expect(state.diagnosis).not.toContain('current live data');
  });

  it('builds a critical diagnosis from jail and keeps churn/slash actions per node', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [
        bondPosition({
          nodeAddress: 'thor1criticalnode000000000000000000000000000',
          isJailed: true,
          slashPoints: 250,
          yieldGuardFlags: ['lowest_bond'],
        }),
      ],
    });

    expect(state.statusLabel).toBe('Action Needed');
    expect(state.headerMetrics[0]).toEqual(expect.objectContaining({
      label: 'Provider exposure',
      value: 'Action',
      detail: 'Score 35/100 · The node is currently in jail and may not be earning.',
    }));
    expect(state.actions.map((item) => item.id)).toEqual(expect.arrayContaining([
      'jail:thor1criticalnode000000000000000000000000000',
      'slash-critical:thor1criticalnode000000000000000000000000000',
      'churn-risk:thor1criticalnode000000000000000000000000000',
    ]));
    expect(state.primaryAction.href).toBe(
      '/dashboard/risk?address=thor1provider&node=thor1criticalnode000000000000000000000000000'
    );
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'jail:thor1criticalnode000000000000000000000000000',
        href: '/dashboard/risk?address=thor1provider&node=thor1criticalnode000000000000000000000000000',
      }),
      expect.objectContaining({
        id: 'slash-critical:thor1criticalnode000000000000000000000000000',
        href: '/dashboard/risk?address=thor1provider&node=thor1criticalnode000000000000000000000000000',
      }),
      expect.objectContaining({
        id: 'churn-risk:thor1criticalnode000000000000000000000000000',
        href: '/dashboard/risk?address=thor1provider&node=thor1criticalnode000000000000000000000000000',
      }),
    ]));
  });

  it('routes non-active node status actions to focused risk context', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [
        bondPosition({
          nodeAddress: 'thor1standbynode0000000000000000000000000000',
          status: 'Standby',
        }),
      ],
    });

    expect(state.severity).toBe('warning');
    expect(state.statusLabel).toBe('Review Needed');
    expect(state.headerMetrics[0]).toEqual(expect.objectContaining({
      label: 'Provider exposure',
      value: 'Review',
      detail: 'Score 75/100 · This position is not in active validator status.',
    }));
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'status:thor1standbynode0000000000000000000000000000:Standby',
        severity: 'warning',
        href: '/dashboard/risk?address=thor1provider&node=thor1standbynode0000000000000000000000000000',
      }),
    ]));
  });

  it('does not call a bonded portfolio healthy while source confidence is unknown', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth({
        lastSuccessful: {
          midgard: null,
          thornode: NOW,
        },
        midgard: 'unknown',
      }),
      positions: [bondPosition()],
      runePriceUpdatedAt: NOW,
    });

    expect(state.severity).toBe('warning');
    expect(state.statusLabel).toBe('Review Needed');
    expect(state.topRisk).toBe('Midgard is unknown');
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source:midgard:unknown',
        severity: 'warning',
      }),
    ]));
  });

  it('routes degraded source actions to source confidence with source-specific consequences', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth({
        midgard: 'degraded',
        lastSuccessful: {
          midgard: new Date('2026-06-12T11:58:00.000Z'),
          thornode: NOW,
        },
      }),
      positions: [bondPosition()],
      runePriceUpdatedAt: NOW,
    });

    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'source:midgard:degraded',
        source: 'Midgard',
        title: 'Midgard is degraded',
        impact: 'Do not use reward history, LP performance, or transaction history for final decisions until Midgard recovers.',
        href: '/dashboard?address=thor1provider#source-confidence',
        primaryAction: 'Review source confidence',
      }),
    ]));
  });

  it('does not call a portfolio healthy while LP performance is current-only or estimated', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [bondPosition()],
      lpPositions: [
        lpPosition({ pool: 'BTC.BTC', pricingSource: 'current-only' }),
        lpPosition({ pool: 'ETH.ETH', pricingSource: 'estimated' }),
      ],
      runePriceUpdatedAt: NOW,
    });

    expect(state.severity).toBe('warning');
    expect(state.statusLabel).toBe('Review Needed');
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'lp:current-only-pricing',
        severity: 'warning',
      }),
      expect.objectContaining({
        id: 'lp:estimated-pricing',
        severity: 'warning',
      }),
    ]));
  });

  it('adds an LP confidence action when redeem quotes are not THORNode-confirmed', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [bondPosition()],
      lpPositions: [
        lpPosition({
          redeemQuoteSource: 'derived',
          claimableTrusted: false,
        }),
      ],
      runePriceUpdatedAt: NOW,
    });

    expect(state.severity).toBe('warning');
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'lp:redeem-quotes-degraded',
        severity: 'warning',
        source: 'LP',
        primaryAction: 'Review LP confidence',
        impact: 'Do not treat estimated withdrawable amounts as claimable before acting on an LP position.',
      }),
    ]));
  });

  it('uses the active warning as provider-exposure context instead of saying all positions are healthy', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [
        bondPosition({
          nodeAddress: 'thor1warningnode0000000000000000000000000000',
          yieldGuardFlags: ['lowest_bond'],
        }),
      ],
    });

    expect(state.statusLabel).toBe('Review Needed');
    expect(state.headerMetrics[0]).toEqual(expect.objectContaining({
      value: 'Review',
      detail: 'Score 95/100 · This node is flagged as one of the lowest-bonded positions in your set.',
    }));
  });

  it('uses provider-exposure copy for warning-level slash actions', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [
        bondPosition({
          nodeAddress: 'thor1slashwarning0000000000000000000000000000',
          slashPoints: 75,
        }),
      ],
    });

    expect(state.primaryAction).toEqual({
      label: 'Review slash exposure',
      href: '/dashboard/risk?address=thor1provider&node=thor1slashwarning0000000000000000000000000000',
    });
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'slash-warning:thor1slashwarning0000000000000000000000000000',
        primaryAction: 'Review slash exposure',
      }),
    ]));
  });

  it('keeps active high-slash nodes in review instead of turning the whole portfolio critical', () => {
    const state = buildDashboardInsightState({
      address: 'thor1provider',
      now: NOW,
      apiHealth: apiHealth(),
      positions: [
        bondPosition({
          nodeAddress: 'thor1highslashone00000000000000000000000000',
          slashPoints: 284_890,
        }),
        bondPosition({
          nodeAddress: 'thor1highslashtwo00000000000000000000000000',
          slashPoints: 291_434,
        }),
        bondPosition({
          nodeAddress: 'thor1highslashthree000000000000000000000000',
          slashPoints: 284_788,
        }),
      ],
    });

    expect(state.severity).toBe('warning');
    expect(state.statusLabel).toBe('Review Needed');
    expect(state.topRisk).toBe('thor1hig...0000 has high slash exposure');
    expect(state.primaryAction.label).toBe('Review slash exposure');
    expect(state.headerMetrics[0]).toEqual(expect.objectContaining({
      label: 'Provider exposure',
      value: 'Review',
      detail: 'Score 65/100 · 284,890 slash points are above the provider-review threshold.',
    }));
    expect(state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'slash-critical:thor1highslashone00000000000000000000000000',
        severity: 'warning',
        title: 'thor1hig...0000 has high slash exposure',
        primaryAction: 'Review slash exposure',
      }),
    ]));
  });
});
