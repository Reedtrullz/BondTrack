'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import { LpSummaryCard } from '@/components/dashboard/lp-summary-card';
import IlCalculator from '@/components/dashboard/il-calculator';
import TaxExport from '@/components/dashboard/tax-export';
import { InsightHeader } from '@/components/dashboard/insight-header';
import { MetricStrip } from '@/components/dashboard/metric-strip';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Calculator, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { formatUsd } from '@/lib/utils/formatters';
import { buildLpPageModel } from '@/lib/dashboard/lp-context';
import type { MetricStripItem } from '@/lib/dashboard/insights';

function formatSignedUsd(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatUsd(value)}`;
}

function getLpIssueDiagnosis(issue: MetricStripItem, totalValue: string): string {
  const issueDetail = issue.detail ?? 'Review source confidence before acting';

  switch (issue.id) {
    case 'lp-redeem-quotes':
      return `${issue.value} LP redeem quote confidence. ${issue.detail ?? 'THORNode redeem quotes are not confirmed'}. Total LP value is ${totalValue}; treat withdrawable amounts as estimated until THORNode confirms them.`;
    case 'current-only-lp-values':
      return `${issue.value} current-only LP position${issue.value === '1' ? '' : 's'} ${issueDetail.toLowerCase()}. Total LP value is ${totalValue}, but aggregate P/L and LP vs HODL exclude positions without historical entry pricing.`;
    case 'estimated-lp-values':
      return `${issue.value} LP position${issue.value === '1' ? ' uses' : 's use'} estimated entry pricing. Total LP value is ${totalValue}, but estimated performance stays out of aggregate P/L.`;
    case 'lp-price-feed':
      return `RUNE price confidence is ${issue.value.toLowerCase()}. Total LP value is ${totalValue}; treat USD values as advisory until the quote recovers.`;
    case 'trusted-lp-values':
      return `No LP position has historical entry pricing yet. Total LP value is ${totalValue}, but aggregate performance is withheld until trusted entry pricing is available.`;
    default:
      return `${issue.label} is ${issue.value.toLowerCase()}. ${issueDetail}`;
  }
}

export default function LpPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading, isHistoricalEnrichmentLoading, error, retry, runePriceFreshness } = useLpPositions(address);
  const [activeTab, setActiveTab] = useState('positions');
  const pageModel = buildLpPageModel({
    isHistoricalEnrichmentLoading,
    isLoading,
    positions,
    runePriceFreshness,
  });
  const primaryConfidenceIssue = pageModel.primaryConfidenceIssue;
  const totalLpValue = formatUsd(pageModel.totalLpValueUsd);
  const lpDiagnosis = primaryConfidenceIssue
    ? getLpIssueDiagnosis(primaryConfidenceIssue, totalLpValue)
    : `All LP positions have historical entry pricing and current RUNE price confidence. Total LP value is ${totalLpValue}; aggregate P/L and LP vs HODL are ready for review.`;
  const lpTopRisk = primaryConfidenceIssue
    ? `${primaryConfidenceIssue.label}: ${primaryConfidenceIssue.value}`
    : 'LP performance is historically priced';
  const lpHeaderSeverity = primaryConfidenceIssue?.severity ?? 'healthy';
  const lpStatusLabel = primaryConfidenceIssue
    ? primaryConfidenceIssue.severity === 'info' ? 'Review Estimates' : 'Needs Attention'
    : 'Trusted';
  const handleReviewLpConfidence = () => {
    window.setTimeout(() => {
      const confidencePanel = document.getElementById('lp-data-confidence');
      if (confidencePanel && typeof confidencePanel.scrollIntoView === 'function') {
        confidencePanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 0);
  };
  const handleReviewLpPositions = () => {
    setActiveTab('positions');

    window.setTimeout(() => {
      const positionsPanel = document.getElementById('lp-positions-tabs');
      if (positionsPanel && typeof positionsPanel.scrollIntoView === 'function') {
        positionsPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 0);
  };
  const confidenceStrip = (
    <MetricStrip id="lp-data-confidence" metrics={pageModel.confidenceMetrics} title="LP data confidence" />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-8">
        <div>
          <Link
            href={address ? `/dashboard?address=${address}` : '/dashboard'}
            className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[var(--color-primary)] dark:text-zinc-400 sm:mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            LP Positions
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
            Manage liquidity positions, calculate impermanent loss, and download position snapshots
          </p>
        </div>
      </div>

      {/* Error State */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-medium">LP member data is temporarily unavailable</p>
          <p className="mt-1 text-sm">
            This is an upstream Midgard response problem. The address <span className="font-mono text-xs">{address}</span> could not be queried right now.
          </p>
          <Button
            onClick={retry}
            className="mt-4"
            variant="outline"
            size="sm"
          >
            Try again
          </Button>
        </div>
      ) : !address ? (
        /* Missing Address State */
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-8 text-center shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <Coins className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Enter a THORChain address
          </h3>
          <p className="mt-2 text-zinc-500">
            Paste an address to inspect source-backed liquidity positions.
          </p>
        </div>
      ) : isLoading ? (
        /* Loading State */
        <>
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-8 text-center shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-[var(--color-primary)]"></div>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Checking LP positions
            </h3>
            <p className="mt-2 text-zinc-500">
              Waiting for Midgard member data before declaring this address empty.
            </p>
          </div>
          <div className="mt-6">
            {confidenceStrip}
          </div>
        </>
      ) : positions && positions.length > 0 ? (
        <>
          <div className="mb-4 sm:mb-6">
            <InsightHeader
              severity={lpHeaderSeverity}
              statusLabel={lpStatusLabel}
              diagnosis={lpDiagnosis}
              topRisk={lpTopRisk}
              headingLevel={2}
              metrics={[
                { label: 'Total LP value', value: totalLpValue, detail: pageModel.totalValueDetail },
                {
                  label: 'Trusted P/L',
                  value: pageModel.hasTrustedHistoricalPerformance ? formatSignedUsd(pageModel.totalPnlUsd) : pageModel.performancePendingLabel,
                  detail: pageModel.aggregatePnlDetail,
                },
                {
                  label: 'LP vs HODL',
                  value: pageModel.hasTrustedHistoricalPerformance ? formatSignedUsd(pageModel.totalIlUsd) : pageModel.performancePendingLabel,
                  detail: pageModel.aggregateIlDetail,
                },
              ]}
              primaryAction={primaryConfidenceIssue
                ? { label: 'Review LP confidence', href: '#lp-data-confidence', onClick: handleReviewLpConfidence }
                : { label: 'Review positions', href: '#lp-positions-tabs', onClick: handleReviewLpPositions }}
              eyebrow="LP performance"
              compactMobileMetrics
            />
          </div>
          <div className="mb-4 sm:mb-6">
            {confidenceStrip}
          </div>

          {/* Tabs */}
          <Tabs id="lp-positions-tabs" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-100 dark:bg-zinc-800">
              <TabsTrigger value="positions" className="gap-2">
                <Coins className="h-4 w-4" />
                My Positions ({positions?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-2">
                <Calculator className="h-4 w-4" />
                IL Calculator
              </TabsTrigger>
              <TabsTrigger value="tax-export" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Position CSV
              </TabsTrigger>
            </TabsList>

            {/* Positions Tab */}
            <TabsContent value="positions" className="space-y-6">
              {isLoading ? (
                <div className="rounded-xl border border-zinc-200 bg-white/80 p-8 text-center shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-[var(--color-primary)]"></div>
                  <p className="mt-4 text-zinc-500">Loading LP positions...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {positions.map((position) => (
                    <LpSummaryCard
                      key={position.pool}
                      position={position}
                      isHistoricalEnrichmentLoading={isHistoricalEnrichmentLoading}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* IL Calculator Tab */}
            <TabsContent value="calculator">
              <IlCalculator />
            </TabsContent>

            {/* Position CSV Tab */}
            <TabsContent value="tax-export">
              <TaxExport
                address={address}
                isHistoricalEnrichmentLoading={isHistoricalEnrichmentLoading}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        /* Empty State */
        <>
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-8 text-center shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
            <Coins className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No LP positions found
            </h3>
            <p className="mt-2 text-zinc-500">
              {address
                ? 'This address has no active liquidity positions.'
                : 'Connect a wallet to view your LP positions.'}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Successful member lookup — the address is valid but has no LP positions.
            </p>
          </div>
          <div className="mt-6">
            {confidenceStrip}
          </div>
        </>
      )}
    </div>
  );
}
