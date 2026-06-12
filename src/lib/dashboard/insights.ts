import type { ApiHealthState, ApiHealthStatus } from '@/lib/hooks/use-api-health';
import type { NetworkRaw } from '@/lib/api/midgard';
import type { BondPosition } from '@/lib/types/node';
import type { LpPosition } from '@/lib/types/lp';
import { NETWORK } from '@/lib/config';
import { calculatePortfolioHealth } from '@/lib/utils/health-score';
import { formatPercent, formatRuneFromNumber, formatUsd, runeToNumber } from '@/lib/utils/formatters';

export type InsightSeverity = 'healthy' | 'info' | 'warning' | 'critical';

export type SourceStatus = 'fresh' | 'stale' | 'degraded' | 'unknown';

export interface ActionItem {
  id: string;
  severity: InsightSeverity;
  source: string;
  title: string;
  detail: string;
  impact: string;
  href: string;
  lastSeen: Date | string;
  primaryAction?: string;
}

export interface SourceFreshness {
  source: string;
  status: SourceStatus;
  lastSuccess: Date | null;
  latencyMs?: number;
  detail?: string;
}

export interface MetricStripItem {
  id: string;
  label: string;
  value: string;
  detail?: string;
  severity?: InsightSeverity;
}

export interface InsightHeaderMetric {
  label: string;
  value: string;
  detail?: string;
}

export interface DashboardInsightState {
  severity: InsightSeverity;
  statusLabel: 'Healthy' | 'Needs Attention' | 'At Risk';
  diagnosis: string;
  topRisk: string;
  primaryAction: {
    label: string;
    href: string;
  };
  headerMetrics: InsightHeaderMetric[];
  actions: ActionItem[];
  sources: SourceFreshness[];
  metrics: MetricStripItem[];
}

interface BuildDashboardInsightStateInput {
  address: string | null;
  positions: BondPosition[];
  lpPositions?: LpPosition[];
  network?: NetworkRaw | null;
  apiHealth: ApiHealthState;
  runePrice?: number | null;
  runePriceUpdatedAt?: Date | null;
  runePriceIsStale?: boolean;
  recentTransactionCount?: number;
  now?: Date;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  healthy: 3,
};

const SOURCE_STATUS_DETAIL: Record<ApiHealthStatus, { status: SourceStatus; detail: string }> = {
  healthy: { status: 'fresh', detail: 'Latest probe succeeded.' },
  degraded: { status: 'degraded', detail: 'Recent probe failed; using last successful data where available.' },
  down: { status: 'degraded', detail: 'Multiple probes failed. Treat live readings as unreliable.' },
  unknown: { status: 'unknown', detail: 'Health probe has not completed yet.' },
};

function buildHref(path: string, address: string | null): string {
  if (!address) return path;
  return `${path}?address=${encodeURIComponent(address)}`;
}

function actionDedupeKey(action: ActionItem): string {
  return action.id.trim().toLowerCase();
}

export function rankActionItems(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDelta !== 0) return severityDelta;
    const aTime = new Date(a.lastSeen).getTime();
    const bTime = new Date(b.lastSeen).getTime();
    return bTime - aTime;
  });
}

export function dedupeActionItems(items: ActionItem[]): ActionItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = actionDedupeKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function formatFreshnessAge(lastSuccess: Date | null, now: Date = new Date()): string {
  if (!lastSuccess) return 'No successful check yet';

  const elapsedMs = Math.max(0, now.getTime() - lastSuccess.getTime());
  if (elapsedMs < 60_000) return 'just now';

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getMostSevere(items: Array<{ severity: InsightSeverity }>): InsightSeverity {
  return items.reduce<InsightSeverity>((current, item) => {
    return SEVERITY_ORDER[item.severity] < SEVERITY_ORDER[current] ? item.severity : current;
  }, 'healthy');
}

export function buildSourceFreshness(
  apiHealth: ApiHealthState,
  options: { runePriceUpdatedAt?: Date | null; runePriceIsStale?: boolean } = {}
): SourceFreshness[] {
  const thornode = SOURCE_STATUS_DETAIL[apiHealth.thornode];
  const midgard = SOURCE_STATUS_DETAIL[apiHealth.midgard];
  const runePriceStatus: SourceStatus = options.runePriceIsStale
    ? 'stale'
    : options.runePriceUpdatedAt
      ? 'fresh'
      : 'unknown';

  return [
    {
      source: 'THORNode',
      status: thornode.status,
      lastSuccess: apiHealth.lastSuccessful.thornode,
      detail: thornode.detail,
    },
    {
      source: 'Midgard',
      status: midgard.status,
      lastSuccess: apiHealth.lastSuccessful.midgard,
      detail: midgard.detail,
    },
    {
      source: 'RUNE price',
      status: runePriceStatus,
      lastSuccess: options.runePriceUpdatedAt ?? null,
      detail: options.runePriceIsStale
        ? 'Price feed is stale; USD values use the last successful quote.'
        : 'Price quote available for USD conversions.',
    },
  ];
}

function buildNodeActions(address: string | null, positions: BondPosition[], now: Date): ActionItem[] {
  return positions.flatMap((position) => {
    const href = buildHref('/dashboard/risk', address);
    const nodeLabel = `${position.nodeAddress.slice(0, 8)}...${position.nodeAddress.slice(-4)}`;
    const actions: ActionItem[] = [];

    if (position.isJailed) {
      actions.push({
        id: `jail:${position.nodeAddress}`,
        severity: 'critical',
        source: 'Node',
        title: `${nodeLabel} is jailed`,
        detail: position.jailReason ?? 'The node is currently in jail and may not be earning.',
        impact: 'Rewards can stop and the node may require operator action before it recovers.',
        href,
        lastSeen: now,
        primaryAction: 'Inspect jail status',
      });
    }

    if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) {
      actions.push({
        id: `slash-critical:${position.nodeAddress}`,
        severity: 'critical',
        source: 'Slash',
        title: `${nodeLabel} has critical slash points`,
        detail: `${position.slashPoints.toLocaleString()} slash points exceed the critical threshold.`,
        impact: 'Bond provider returns and node eligibility are at immediate risk.',
        href,
        lastSeen: now,
        primaryAction: 'Review slash monitor',
      });
    } else if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning) {
      actions.push({
        id: `slash-warning:${position.nodeAddress}`,
        severity: 'warning',
        source: 'Slash',
        title: `${nodeLabel} has elevated slash points`,
        detail: `${position.slashPoints.toLocaleString()} slash points are above the warning threshold.`,
        impact: 'The node should be watched before the next churn and before adding more bond.',
        href,
        lastSeen: now,
        primaryAction: 'Check node trend',
      });
    }

    if (position.yieldGuardFlags?.includes('lowest_bond')) {
      actions.push({
        id: `churn-risk:${position.nodeAddress}`,
        severity: 'warning',
        source: 'Churn',
        title: `${nodeLabel} is near churn risk`,
        detail: 'This node is flagged as one of the lowest-bonded positions in your set.',
        impact: 'A low bond rank can reduce earning continuity during churn events.',
        href,
        lastSeen: now,
        primaryAction: 'Review churn risk',
      });
    }

    if (position.status !== 'Active') {
      actions.push({
        id: `status:${position.nodeAddress}:${position.status}`,
        severity: position.status === 'Disabled' ? 'critical' : 'info',
        source: 'Status',
        title: `${nodeLabel} is ${position.status}`,
        detail: 'This position is not in active validator status.',
        impact: 'Non-active nodes may not earn active-set rewards.',
        href: buildHref('/dashboard/nodes', address),
        lastSeen: now,
        primaryAction: 'Inspect node',
      });
    }

    return actions;
  });
}

function buildSourceActions(address: string | null, sources: SourceFreshness[], now: Date): ActionItem[] {
  return sources.flatMap((source) => {
    if (source.status === 'fresh') return [];

    const severity: InsightSeverity = source.status === 'degraded' ? 'warning' : source.status === 'stale' ? 'warning' : 'info';
    return [{
      id: `source:${source.source.toLowerCase().replace(/\s+/g, '-')}:${source.status}`,
      severity,
      source: 'Data source',
      title: `${source.source} is ${source.status}`,
      detail: source.detail ?? 'Source confidence is not fully fresh.',
      impact: 'Treat derived metrics as advisory until the source recovers.',
      href: buildHref('/dashboard/settings/notifications', address),
      lastSeen: now,
      primaryAction: 'View source health',
    }];
  });
}

function buildLpActions(address: string | null, positions: LpPosition[], now: Date): ActionItem[] {
  const estimatedCount = positions.filter((position) => position.pricingSource === 'estimated').length;
  const currentOnlyCount = positions.filter((position) => position.pricingSource === 'current-only').length;

  const actions: ActionItem[] = [];
  if (currentOnlyCount > 0) {
    actions.push({
      id: 'lp:current-only-pricing',
      severity: 'info',
      source: 'LP',
      title: `${currentOnlyCount} LP position${currentOnlyCount === 1 ? '' : 's'} missing entry pricing`,
      detail: 'Current value is available, but P/L and impermanent-loss totals are hidden.',
      impact: 'Do not use LP performance totals for decisions until historical pricing enriches.',
      href: buildHref('/dashboard/lp', address),
      lastSeen: now,
      primaryAction: 'Review LP confidence',
    });
  }

  if (estimatedCount > 0) {
    actions.push({
      id: 'lp:estimated-pricing',
      severity: 'info',
      source: 'LP',
      title: `${estimatedCount} LP position${estimatedCount === 1 ? '' : 's'} use estimated entry pricing`,
      detail: 'Estimated LP P/L is shown per pool and excluded from trusted aggregate totals.',
      impact: 'Use trusted historical values for aggregate decisions.',
      href: buildHref('/dashboard/lp', address),
      lastSeen: now,
      primaryAction: 'Review estimates',
    });
  }

  return actions;
}

export function buildDashboardInsightState(input: BuildDashboardInsightStateInput): DashboardInsightState {
  const now = input.now ?? new Date();
  const positions = input.positions;
  const lpPositions = input.lpPositions ?? [];
  const sources = buildSourceFreshness(input.apiHealth, {
    runePriceUpdatedAt: input.runePriceUpdatedAt,
    runePriceIsStale: input.runePriceIsStale,
  });
  const totalBonded = positions.reduce((sum, position) => sum + position.bondAmount, 0);
  const totalLpValueUsd = lpPositions.reduce((sum, position) => sum + position.currentTotalValueUsd, 0);
  const activeNodes = positions.filter((position) => position.status === 'Active').length;
  const jailedNodes = positions.filter((position) => position.isJailed).length;
  const weightedApy = positions.length > 0 && totalBonded > 0
    ? positions.reduce((sum, position) => sum + position.netAPY * position.bondAmount, 0) / totalBonded
    : 0;
  const health = calculatePortfolioHealth(positions);
  const actions = rankActionItems(dedupeActionItems([
    ...buildNodeActions(input.address, positions, now),
    ...buildSourceActions(input.address, sources, now),
    ...buildLpActions(input.address, lpPositions, now),
  ]));
  const mostSevereAction = actions[0];
  const sourceSeverity = sources.some((source) => source.status === 'degraded' || source.status === 'stale')
    ? 'warning'
    : sources.some((source) => source.status === 'unknown')
      ? 'info'
      : 'healthy';
  const severity = getMostSevere([
    { severity: health.isCritical ? 'critical' : health.score < NETWORK.HEALTH_SCORE_THRESHOLDS.healthy ? 'warning' : 'healthy' },
    { severity: mostSevereAction?.severity ?? 'healthy' },
    { severity: sourceSeverity },
  ]);
  const statusLabel = severity === 'critical'
    ? 'At Risk'
    : severity === 'warning'
      ? 'Needs Attention'
      : 'Healthy';
  const diagnosis = positions.length === 0
    ? 'No active bond-provider position was found for this address. Start by confirming the address or preparing a BOND transaction.'
    : statusLabel === 'Healthy'
      ? 'No urgent node, source, or LP confidence issues are visible in the current live data.'
      : mostSevereAction?.detail ?? health.reason;
  const topRisk = mostSevereAction
    ? mostSevereAction.title
    : positions.length === 0
      ? 'No bonded positions detected'
      : 'No urgent risk detected';
  const primaryAction = mostSevereAction
    ? { label: mostSevereAction.primaryAction ?? 'Inspect issue', href: mostSevereAction.href }
    : positions.length === 0
      ? { label: 'Open Bond Composer', href: buildHref('/dashboard/transactions', input.address) }
      : { label: 'Review Risk', href: buildHref('/dashboard/risk', input.address) };
  const healthMetricDetail = severity === 'healthy'
    ? health.reason
    : mostSevereAction?.title ?? health.reason;

  return {
    severity,
    statusLabel,
    diagnosis,
    topRisk,
    primaryAction,
    headerMetrics: [
      { label: 'Health score', value: `${health.score}/100`, detail: healthMetricDetail },
      { label: 'Bonded', value: formatRuneFromNumber(totalBonded), detail: `${positions.length} node${positions.length === 1 ? '' : 's'}` },
      { label: 'Net APY', value: weightedApy > 0 ? formatPercent(weightedApy, 2) : '--', detail: 'Weighted by bond' },
    ],
    actions,
    sources,
    metrics: [
      { id: 'total-bond', label: 'Total bond', value: formatRuneFromNumber(totalBonded), detail: input.runePrice ? formatUsd(totalBonded * input.runePrice) : undefined },
      { id: 'active-nodes', label: 'Active nodes', value: String(activeNodes), detail: `${positions.length} tracked` },
      { id: 'jailed-nodes', label: 'Jailed nodes', value: String(jailedNodes), severity: jailedNodes > 0 ? 'critical' : 'healthy', detail: jailedNodes > 0 ? 'Action needed' : 'None' },
      { id: 'rewards', label: 'Reward rate', value: weightedApy > 0 ? `${weightedApy.toFixed(2)}%` : '--', detail: 'Net weighted APY' },
      { id: 'lp-value', label: 'LP value', value: totalLpValueUsd > 0 ? formatUsd(totalLpValueUsd) : '--', detail: `${lpPositions.length} pool${lpPositions.length === 1 ? '' : 's'}` },
      {
        id: 'recent-transactions',
        label: 'Recent tx',
        value: String(input.recentTransactionCount ?? 0),
        detail: 'Bond events loaded',
      },
      {
        id: 'network-bond',
        label: 'Network bond',
        value: input.network?.bondMetrics
          ? formatRuneFromNumber(runeToNumber(input.network.bondMetrics.totalActiveBond) + runeToNumber(input.network.bondMetrics.totalStandbyBond))
          : '--',
        detail: 'Active + standby',
      },
    ],
  };
}
