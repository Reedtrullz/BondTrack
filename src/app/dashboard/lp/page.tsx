'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import { LpSummaryCard } from '@/components/dashboard/lp-summary-card';
import IlCalculator from '@/components/dashboard/il-calculator';
import TaxExport from '@/components/dashboard/tax-export';
import { MetricStrip } from '@/components/dashboard/metric-strip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Calculator, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { formatUsd } from '@/lib/utils/formatters';

export default function LpPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading, isHistoricalEnrichmentLoading, error, retry, runePriceFreshness } = useLpPositions(address);
  const [activeTab, setActiveTab] = useState('positions');

  // Calculate total LP stats. Aggregate performance only uses true historical entry pricing.
  const trustedHistoricalPositions = positions?.filter((pos) => pos.pricingSource === 'historical') ?? [];
  const totalStats = trustedHistoricalPositions.reduce(
    (acc, pos) => {
      acc.totalPnl += pos.netProfitLossUsd ?? 0;
      acc.totalIl += pos.impermanentLossUsd ?? 0;
      return acc;
    },
    { totalPnl: 0, totalIl: 0 }
  );
  const totalLpValue = positions?.reduce((sum, pos) => sum + (pos.currentTotalValueUsd ?? 0), 0) ?? 0;
  const estimatedPositions = positions?.filter(p => p.pricingSource === 'estimated') ?? [];
  const hasUntrustedPerformance = isHistoricalEnrichmentLoading || (positions?.some(
    (position) =>
      position.pricingSource === 'current-only' ||
      position.pricingSource === 'estimated' ||
      position.netProfitLossUsd === null ||
      position.impermanentLossUsd === null
  ) ?? false);
  const hasTrustedHistoricalPerformance = trustedHistoricalPositions.length > 0;
  const performancePendingLabel = isHistoricalEnrichmentLoading ? 'Enriching...' : hasTrustedHistoricalPerformance ? 'Historical only' : 'Incomplete';

  // Count positions lacking historical pricing
  const positionsWithoutHistory = positions?.filter(p => p.pricingSource === 'current-only') ?? [];
  const showHistoricalEnrichmentNotice = isHistoricalEnrichmentLoading && positionsWithoutHistory.length > 0;
  const showPricingWarning = !showHistoricalEnrichmentNotice && positionsWithoutHistory.length > 0;
  const showEstimatedWarning = estimatedPositions.length > 0;
  const confidenceMetrics = [
    {
      id: 'trusted-lp-values',
      label: 'Trusted values',
      value: String(trustedHistoricalPositions.length),
      detail: 'Historical entry pricing',
      severity: trustedHistoricalPositions.length > 0 ? 'healthy' as const : 'info' as const,
    },
    {
      id: 'estimated-lp-values',
      label: 'Estimated values',
      value: String(estimatedPositions.length),
      detail: showEstimatedWarning ? 'Excluded from aggregate P/L' : 'None',
      severity: showEstimatedWarning ? 'info' as const : 'healthy' as const,
    },
    {
      id: 'current-only-lp-values',
      label: 'Current-only',
      value: String(positionsWithoutHistory.length),
      detail: showHistoricalEnrichmentNotice ? 'Enriching now' : showPricingWarning ? 'History unavailable' : 'None',
      severity: showPricingWarning || showHistoricalEnrichmentNotice ? 'warning' as const : 'healthy' as const,
    },
    {
      id: 'lp-price-feed',
      label: 'RUNE price',
      value: runePriceFreshness?.isStale ? 'Stale' : 'Fresh',
      detail: runePriceFreshness?.updatedAt ? `Updated ${runePriceFreshness.updatedAt.toLocaleString()}` : 'Midgard quote',
      severity: runePriceFreshness?.isStale ? 'warning' as const : 'healthy' as const,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href={address ? `/dashboard?address=${address}` : '/dashboard'}
            className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[var(--color-primary)] dark:text-zinc-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            LP Positions
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Manage liquidity positions, calculate impermanent loss, and download position snapshots
          </p>
        </div>
      </div>

      <div className="mb-6">
        <MetricStrip metrics={confidenceMetrics} title="LP data confidence" />
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
            Paste an address to inspect live liquidity positions.
          </p>
        </div>
      ) : positions && positions.length > 0 ? (
        <>
          {/* Total Stats */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-500">Total LP Value</div>
                <div className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100">
                  {formatUsd(totalLpValue)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-500">Net P/L</div>
                <div className={`text-2xl font-bold font-display ${
                  hasUntrustedPerformance
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : totalStats.totalPnl >= 0
                      ? 'text-[var(--color-success)]'
                      : 'text-[var(--color-danger)]'
                }`}>
                  {hasUntrustedPerformance
                    ? performancePendingLabel
                    : `${totalStats.totalPnl >= 0 ? '+' : ''}${formatUsd(totalStats.totalPnl)}`}
                </div>
                {hasUntrustedPerformance && hasTrustedHistoricalPerformance ? (
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {`${totalStats.totalPnl >= 0 ? '+' : ''}${formatUsd(totalStats.totalPnl)} from historical positions; estimated/current-only excluded`}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-500">Total Impermanent Loss</div>
                <div className={`text-2xl font-bold font-display ${
                  hasUntrustedPerformance
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : totalStats.totalIl < 0
                      ? 'text-[var(--color-danger)]'
                      : totalStats.totalIl > 0
                        ? 'text-[var(--color-success)]'
                        : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {hasUntrustedPerformance
                    ? performancePendingLabel
                    : `${totalStats.totalIl > 0 ? '+' : ''}${formatUsd(totalStats.totalIl)}`}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
      )}
    </div>
  );
}
