'use client';

export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { useRunePrice, useHistoricalRunePrice } from '@/lib/hooks/use-rune-price';
import { useBondHistory } from '@/lib/hooks/use-bond-history';
import { PnLDashboard } from '@/components/dashboard/pnl-dashboard';
import { PersonalFeeAudit } from '@/components/dashboard/fee-impact-tracker';
import { AutoCompoundChart } from '@/components/dashboard/auto-compound-chart';
import { PriceChart } from '@/components/dashboard/price-chart';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { AlertTriangle, BarChart3, Download, FileText, Search, TrendingUp, Zap } from 'lucide-react';
import { useNetworkMetrics } from '@/lib/hooks/use-network-metrics';
import { Button } from '@/components/ui/button';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { DashboardLoadingSkeleton } from '@/components/shared/dashboard-loading-skeleton';
import { FocusDialog } from '@/components/ui/focus-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DisclosureSection } from '@/components/dashboard/disclosure-section';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { MetricStrip } from '@/components/dashboard/metric-strip';
import { buildDashboardInsightState, resolveThornodeGatedBondAction } from '@/lib/dashboard/insights';
import { buildRewardsPageModel } from '@/lib/dashboard/rewards-context';
import { useApiHealthContext } from '@/lib/hooks/use-api-health';
import { formatCompactNumber, formatPercent, formatRuneFromNumber } from '@/lib/utils/formatters';

function RewardsStateCard({
  tone,
  title,
  description,
  detail,
  action,
}: {
  tone: 'empty' | 'error';
  title: string;
  description: string;
  detail: string;
  action?: ReactNode;
}) {
  const Icon = tone === 'error' ? AlertTriangle : Search;
  const iconClass = tone === 'error'
    ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';

  return (
    <DashboardCard className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
      <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-zinc-500 dark:text-zinc-400">{detail}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </DashboardCard>
  );
}

function RewardsLoadingState() {
  return (
    <DashboardLoadingSkeleton
      title="Loading rewards data"
      detail="Waiting for bond positions, reward history, RUNE price, and network APY before showing return, fees, forecast, or tax worksheet context."
      cards={3}
      className="p-0 pb-20"
    />
  );
}

export default function RewardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading, error } = useBondPositions(address);
  const { price: runePrice, isStale: runePriceIsStale, updatedAt: runePriceUpdatedAt } = useRunePrice();
  const { data: networkData } = useNetworkMetrics();
  const { history: bondHistory, isLoading: isLoadingActions, error: actionsError } = useBondHistory(address);
  const { price: entryRunePrice } = useHistoricalRunePrice(bondHistory?.firstBondDate || null);
  const apiHealth = useApiHealthContext();

  const [mounted, setMounted] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxStartDate, setTaxStartDate] = useState('');
  const [taxEndDate, setTaxEndDate] = useState('');
  const [taxExportLoading, setTaxExportLoading] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [taxWarning, setTaxWarning] = useState<string | null>(null);
  const [activeRewardsTab, setActiveRewardsTab] = useState('return');
  const safePositions = useMemo(() => positions ?? [], [positions]);
  const rewardsModel = useMemo(() => buildRewardsPageModel({
    actionsError,
    bondHistory,
    isLoadingActions,
    networkBondingAPY: networkData?.bondingAPY,
    positions: safePositions,
    runePrice,
    runePriceIsStale,
  }), [
    actionsError,
    bondHistory,
    isLoadingActions,
    networkData?.bondingAPY,
    runePrice,
    runePriceIsStale,
    safePositions,
  ]);
  const weightedApy = rewardsModel.weightedApy;
  const runePriceMetric = rewardsModel.runePriceMetric;
  const rewardsInsight = useMemo(() => buildDashboardInsightState({
    address,
    positions: safePositions,
    network: networkData,
    apiHealth,
    runePrice,
    runePriceIsStale,
    runePriceUpdatedAt,
  }), [
    address,
    safePositions,
    networkData,
    apiHealth,
    runePrice,
    runePriceIsStale,
    runePriceUpdatedAt,
  ]);
  const bondComposerAction = resolveThornodeGatedBondAction(rewardsInsight.actions, {
    label: 'Open Bond Composer',
    href: address
      ? `/dashboard/transactions?address=${encodeURIComponent(address)}`
      : '/dashboard/transactions',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOptimizeNow = () => {
    const params = new URLSearchParams();

    if (address) {
      params.set('address', address);
    }

    router.push(`/dashboard/risk?${params.toString()}`);
  };

  const handleReviewFees = () => {
    setActiveRewardsTab('fees');

    window.setTimeout(() => {
      const feesPanel = document.getElementById('rewards-fees-panel');
      if (feesPanel && typeof feesPanel.scrollIntoView === 'function') {
        feesPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 0);
  };

  const handleReviewDataConfidence = () => {
    window.setTimeout(() => {
      const confidencePanel = document.getElementById('rewards-data-confidence');
      if (confidencePanel && typeof confidencePanel.scrollIntoView === 'function') {
        confidencePanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 0);
  };

  const handleExportTaxReport = async () => {
    if (!taxStartDate || !taxEndDate || !address) return;

    if (taxStartDate > taxEndDate) {
      setTaxError('Start date must be before or equal to end date.');
      return;
    }

    setTaxExportLoading(true);
    setTaxError(null);
    setTaxWarning(null);
    try {
      const response = await fetch('/api/tax-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, startDate: taxStartDate, endDate: taxEndDate }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to generate tax worksheet');
      }

      const warningsHeader = response.headers.get('X-Heimdall-Tax-Warnings');
      const warnings = warningsHeader ? JSON.parse(warningsHeader) as Array<{ message?: string }> : [];
      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tax-worksheet-${address.slice(0, 8)}-${taxStartDate}-to-${taxEndDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      if (warnings.length > 0) {
        setTaxWarning(warnings.map((warning) => warning.message).filter(Boolean).join(' ') || 'Worksheet downloaded, but older history may be incomplete.');
      } else {
        setShowTaxModal(false);
      }
    } catch (err) {
      setTaxError(err instanceof Error ? err.message : 'Tax worksheet export failed.');
    } finally {
      setTaxExportLoading(false);
    }
  };

  if (isLoading) {
    return <RewardsLoadingState />;
  }

  if (!mounted) {
    return <div className="p-8 flex items-center justify-center min-h-[400px]" />;
  }

  if (!address) {
    return (
      <div className="space-y-8 pb-20">
        <RewardsStateCard
          tone="empty"
          title="Enter a THORChain address"
          description="Paste a bond-provider address to calculate net rewards, operator fee leakage, and tax worksheet context."
          detail="Rewards stay hidden until there is an address to query, so the page does not confuse a missing input with a confirmed zero-reward portfolio."
        />
        <DashboardCard>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Market Context</h2>
          </div>
          <PriceChart />
        </DashboardCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 pb-20">
        <RewardsStateCard
          tone="error"
          title="Rewards data is temporarily unavailable"
          description="The bond-position lookup failed before reward calculations could be trusted."
          detail={error instanceof Error ? error.message : 'Use the global refresh control after Midgard or THORNode recovers.'}
        />
      </div>
    );
  }

  const hasPositions = safePositions.length > 0;
  const primaryConfidenceIssue = rewardsModel.primaryConfidenceIssue;
  const weightedApyCopy = weightedApy > 0 ? formatPercent(weightedApy) : 'not available yet';
  const rewardsDiagnosis = primaryConfidenceIssue
    ? `${primaryConfidenceIssue.label} is ${primaryConfidenceIssue.value.toLowerCase()}. ${primaryConfidenceIssue.detail}. Weighted net APY is ${weightedApyCopy}; use the confidence panel before relying on return, forecast, or tax outputs.`
    : `Weighted net APY is ${weightedApyCopy}. Returns, fee leakage, forecast assumptions, and tax worksheet context are separated below so each decision has its own context.`;
  const rewardsTopRisk = primaryConfidenceIssue
    ? `${primaryConfidenceIssue.label}: ${primaryConfidenceIssue.value}`
    : weightedApy > 0
      ? `Net reward stance: ${formatPercent(weightedApy)} weighted APY`
      : rewardsInsight.topRisk;
  const rewardsPrimaryAction = primaryConfidenceIssue
    ? {
        label: 'Review data confidence',
        href: '#rewards-data-confidence',
        onClick: handleReviewDataConfidence,
      }
    : {
        label: 'Review Fees',
        href: '#rewards-fees-panel',
        onClick: handleReviewFees,
      };
  const rewardsSeverity = primaryConfidenceIssue?.severity ?? rewardsInsight.severity;
  const rewardsStatusLabel = primaryConfidenceIssue
    ? primaryConfidenceIssue.severity === 'critical' ? 'Action Needed' : 'Review Needed'
    : rewardsInsight.statusLabel;
  const bondedRune = safePositions.reduce((sum, position) => sum + position.bondAmount, 0);

  return (
    <div className="space-y-12 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Rewards</h1>
      {hasPositions ? (
        <>
          <InsightHeader
            severity={rewardsSeverity}
            statusLabel={rewardsStatusLabel}
            diagnosis={rewardsDiagnosis}
            topRisk={rewardsTopRisk}
            headingLevel={2}
            metrics={[
              { label: 'Weighted APY', value: weightedApy > 0 ? formatPercent(weightedApy) : '--', detail: 'After operator fees' },
              {
                label: 'Bonded',
                value: formatRuneFromNumber(bondedRune),
                compactValue: `ᚱ${formatCompactNumber(bondedRune)}`,
                detail: `${safePositions.length} node${safePositions.length === 1 ? '' : 's'}`,
              },
              { label: 'RUNE price', ...runePriceMetric },
            ]}
            primaryAction={rewardsPrimaryAction}
            eyebrow="Rewards"
            compactMobileMetrics
          />

          <MetricStrip id="rewards-data-confidence" metrics={rewardsModel.confidenceMetrics} title="Rewards data confidence" />

          <Tabs value={activeRewardsTab} onValueChange={setActiveRewardsTab} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800 md:grid-cols-4">
              <TabsTrigger value="return">Return</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="tax">Tax</TabsTrigger>
            </TabsList>

            <TabsContent value="return" className="space-y-4">
              <DashboardCard className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Net return</h2>
                </div>
                <PnLDashboard
                  positions={safePositions}
                  currentRunePrice={runePrice || 0}
                  currentRunePriceIsStale={runePriceIsStale}
                  currentRunePriceUpdatedAt={runePriceUpdatedAt}
                  address={address}
                  entryRunePrice={entryRunePrice || undefined}
                  bondHistory={bondHistory ?? undefined}
                  actionsError={actionsError}
                  isLoadingActions={isLoadingActions}
                />
              </DashboardCard>
            </TabsContent>

            <TabsContent id="rewards-fees-panel" value="fees">
              <DashboardCard>
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Fee leakage</h2>
                </div>
                <PersonalFeeAudit positions={safePositions} networkApy={weightedApy} />
              </DashboardCard>
            </TabsContent>

            <TabsContent value="forecast">
              {weightedApy > 0 ? (
                <AutoCompoundChart
                  positions={safePositions}
                  weightedApy={weightedApy}
                />
              ) : (
                <DashboardCard className="p-8 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
                  <FileText className="mb-3 h-8 w-8 text-zinc-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">APY baseline unavailable</h3>
                  <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                    Neither node-level APY nor a network fallback has loaded yet, so compounding forecasts are withheld instead of showing a placeholder projection.
                  </p>
                </DashboardCard>
              )}
            </TabsContent>

            <TabsContent value="tax">
              <DashboardCard>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Reward tax worksheet</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      CSV includes date-inclusive FIFO bond rows and estimated LP confidence metadata. It is not a filing-ready tax report.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTaxError(null);
                      setTaxWarning(null);
                      setShowTaxModal(true);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Export Worksheet CSV
                  </Button>
                </div>
              </DashboardCard>
            </TabsContent>
          </Tabs>

          <DashboardCard>
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                <div>
                  <div className="text-xs font-bold text-zinc-400 uppercase">Next reward decision</div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {safePositions.length === 1
                      ? 'Your portfolio is concentrated in a single node. Review churn rank and operator fee exposure before adding more bond.'
                      : 'Your portfolio spans multiple nodes. Review risk concentration before compounding additional rewards.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleOptimizeNow}
                className="min-w-[8.5rem]"
              >
                Review Risk
              </Button>
            </div>
          </DashboardCard>
        </>
      ) : (
        <RewardsStateCard
          tone="empty"
          title="No bonded positions found"
          description="The address was queried successfully, but it is not currently listed as a bond provider on an active node."
          detail="Bond RUNE to a node operator first; then this page will show net APY, operator fee impact, reward velocity, and tax worksheet options."
          action={
            <Button type="button" size="sm" onClick={() => router.push(bondComposerAction.href)}>
              {bondComposerAction.label}
            </Button>
          }
        />
      )}

      <DisclosureSection title="Market context" summary="RUNE price context is secondary to net reward and fee decisions.">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">RUNE Price</h2>
        </div>
        <PriceChart />
      </DisclosureSection>

      {showTaxModal && (
        <FocusDialog
          open
          titleId="tax-export-title"
          descriptionId="tax-export-description"
          onClose={() => setShowTaxModal(false)}
          className="px-4"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-900"
          >
            <h3 id="tax-export-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Export tax worksheet CSV</h3>
            <p id="tax-export-description" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Choose a date range for FIFO bond rows and estimated LP income confidence metadata. Use it for reconciliation before tax filing; it is not a filing-ready tax report.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="tax-start-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label>
                <input
                  id="tax-start-date"
                  type="date"
                  value={taxStartDate}
                  onChange={(e) => setTaxStartDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label htmlFor="tax-end-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label>
                <input
                  id="tax-end-date"
                  type="date"
                  value={taxEndDate}
                  onChange={(e) => setTaxEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              {taxError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300" role="alert">
                  {taxError}
                </div>
              ) : null}
              {taxWarning ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300" role="status">
                  {taxWarning}
                </div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTaxModal(false)}
                  disabled={taxExportLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleExportTaxReport}
                  disabled={!taxStartDate || !taxEndDate || taxExportLoading}
                >
                  {taxExportLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </span>
                  ) : (
                    'Download CSV'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </FocusDialog>
      )}
    </div>
  );
}
