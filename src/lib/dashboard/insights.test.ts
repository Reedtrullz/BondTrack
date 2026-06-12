import { describe, expect, it } from 'vitest';
import {
  buildDashboardInsightState,
  buildSourceFreshness,
  dedupeActionItems,
  formatFreshnessAge,
  rankActionItems,
  type ActionItem,
} from './insights';
import type { ApiHealthState } from '@/lib/hooks/use-api-health';
import type { BondPosition } from '@/lib/types/node';

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

    expect(state.statusLabel).toBe('At Risk');
    expect(state.headerMetrics[0]).toEqual(expect.objectContaining({
      label: 'Health score',
      detail: 'thor1cri...0000 is jailed',
    }));
    expect(state.actions.map((item) => item.id)).toEqual(expect.arrayContaining([
      'jail:thor1criticalnode000000000000000000000000000',
      'slash-critical:thor1criticalnode000000000000000000000000000',
      'churn-risk:thor1criticalnode000000000000000000000000000',
    ]));
  });

  it('uses the active warning as health-score context instead of saying all positions are healthy', () => {
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

    expect(state.statusLabel).toBe('Needs Attention');
    expect(state.headerMetrics[0]).toEqual(expect.objectContaining({
      value: '95/100',
      detail: 'thor1war...0000 is near churn risk',
    }));
  });
});
