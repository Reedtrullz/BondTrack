'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldAlert, Wallet } from 'lucide-react';
import { ActionQueue } from '@/components/dashboard/action-queue';
import { DisclosureSection } from '@/components/dashboard/disclosure-section';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { MetricStrip } from '@/components/dashboard/metric-strip';
import { SourceFreshnessPanel } from '@/components/dashboard/source-freshness-panel';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';
import { buttonVariants } from '@/components/ui/button';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';
import { useBondHistory } from '@/lib/hooks/use-bond-history';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { useRunePriceHistory } from '@/lib/hooks/use-rune-price';
import { buildDashboardInsightState, resolveThornodeGatedBondAction } from '@/lib/dashboard/insights';
import { calculateNodeRiskScore, isUrgentNodeException } from '@/lib/dashboard/nodes-context';
import { formatBasisPoints, formatRuneFromNumber } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

function LoadingCommandCenter() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <DashboardLoadingSkeleton
        title="Loading command center"
        detail="Waiting for bond positions, LP exposure, network metrics, and RUNE price before ranking urgent actions."
        cards={4}
        className="p-0"
      />
    </div>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading: positionsLoading } = useBondPositions(address);
  const { positions: lpPositions } = useLpPositions(address);
  const { data: network } = useNetworkMetrics();
  const {
    price: runePrice,
    isStale: runePriceIsStale,
    updatedAt: runePriceUpdatedAt,
  } = useRunePriceHistory('hour', 24);
  const { bondActions } = useBondHistory(address);
  const apiHealth = useApiHealthContext();

  const thornodeSourceUnreliable = apiHealth.thornode === 'degraded' || apiHealth.thornode === 'down';
  const isInitialLoading = positionsLoading && !thornodeSourceUnreliable;
  const insight = useMemo(() => buildDashboardInsightState({
    address,
    positions,
    lpPositions,
    network,
    apiHealth,
    runePrice,
    runePriceIsStale,
    runePriceUpdatedAt,
    recentTransactionCount: bondActions.length,
  }), [
    address,
    positions,
    lpPositions,
    network,
    apiHealth,
    runePrice,
    runePriceIsStale,
    runePriceUpdatedAt,
    bondActions.length,
  ]);

  if (isInitialLoading) {
    return <LoadingCommandCenter />;
  }

  const topNodes = [...positions]
    .sort((left, right) => {
      const leftRisk = Number(isUrgentNodeException(left)) * 10_000 + Number(left.isJailed) * 1_000 + calculateNodeRiskScore(left) + (left.yieldGuardFlags?.length ?? 0) * 50;
      const rightRisk = Number(isUrgentNodeException(right)) * 10_000 + Number(right.isJailed) * 1_000 + calculateNodeRiskScore(right) + (right.yieldGuardFlags?.length ?? 0) * 50;
      return rightRisk - leftRisk;
    })
    .slice(0, 4);
  const bondEntryAction = resolveThornodeGatedBondAction(insight.actions, {
    label: 'Open BOND',
    href: address
      ? `/dashboard/transactions?address=${encodeURIComponent(address)}&action=bond`
      : '/dashboard/transactions?action=bond',
  });
  const bondEntryVariant = bondEntryAction.kind === 'source-confidence' ? 'outline' : 'success';

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
      <InsightHeader
        severity={insight.severity}
        statusLabel={insight.statusLabel}
        diagnosis={insight.diagnosis}
        topRisk={insight.topRisk}
        metrics={insight.headerMetrics}
        primaryAction={insight.primaryAction}
        compactMobileMetrics
      />

      <div id="source-confidence" className="space-y-4 scroll-mt-4">
        <div className="lg:hidden">
          <SourceFreshnessPanel sources={insight.sources} compact />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <ActionQueue items={insight.actions} mobileCompact />
          <div className="hidden lg:block">
            <SourceFreshnessPanel sources={insight.sources} />
          </div>
        </div>
      </div>

      <MetricStrip metrics={insight.metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Riskiest nodes first</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Urgent exceptions are highlighted before the full Nodes table.
              </p>
            </div>
            <Link
              href={address ? `/dashboard/nodes?address=${encodeURIComponent(address)}` : '/dashboard/nodes'}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
            >
              Nodes
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {topNodes.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
              No bonded nodes found for this address.
            </div>
          ) : (
            <div className="space-y-2">
              {topNodes.map((node) => {
                const isException = isUrgentNodeException(node);
                return (
                  <div
                    key={node.nodeAddress}
                    className={cn(
                      'rounded-xl border p-3',
                      isException
                        ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20'
                        : 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/30'
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {node.nodeAddress.slice(0, 10)}...{node.nodeAddress.slice(-6)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Status: {node.isJailed ? 'Jailed' : node.status}</span>
                          <span>Slash: {node.slashPoints.toLocaleString()}</span>
                          <span>Fee: {formatBasisPoints(node.operatorFee)}</span>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-bold text-zinc-950 dark:text-zinc-50">
                        {formatRuneFromNumber(node.bondAmount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="p-5" role="region" aria-label="Next transaction">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Next transaction</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Composer-first access for BOND and UNBOND work.
              </p>
            </div>
            <Wallet className="h-5 w-5 text-zinc-400" aria-hidden="true" />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Use wallet-confirmed deposit fees</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  Heimdall now treats transaction fees as wallet/network-confirmed instead of showing a fixed RUNE preview.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={bondEntryAction.href}
                className={buttonVariants({ variant: bondEntryVariant, size: 'sm' })}
              >
                {bondEntryAction.label}
              </Link>
              <Link
                href={address ? `/dashboard/transactions?address=${encodeURIComponent(address)}&action=unbond` : '/dashboard/transactions?action=unbond'}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Open UNBOND
              </Link>
            </div>
          </div>
        </DashboardCard>
      </div>

      <DisclosureSection
        title="Detailed portfolio inspection"
        summary="Tables, charts, LP confidence details, and reward analysis stay available below the triage layer."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Portfolio', '/dashboard/portfolio'],
            ['Risk', '/dashboard/risk'],
            ['Rewards', '/dashboard/rewards'],
            ['LP Status', '/dashboard/lp'],
          ].map(([label, path]) => (
            <Link
              key={path}
              href={address ? `${path}?address=${encodeURIComponent(address)}` : path}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {label}
            </Link>
          ))}
        </div>
      </DisclosureSection>
    </div>
  );
}
