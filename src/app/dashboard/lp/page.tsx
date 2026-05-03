'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import { LpSummaryCard } from '@/components/dashboard/lp-summary-card';
import IlCalculator from '@/components/dashboard/il-calculator';
import TaxExport from '@/components/dashboard/tax-export';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Calculator, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { formatUsd } from '@/lib/utils/formatters';

export default function LpPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading, error, state } = useLpPositions(address);
  const [activeTab, setActiveTab] = useState('positions');

  // Calculate total LP stats
  const totalStats = positions?.reduce(
    (acc, pos) => {
      acc.totalValue += pos.currentTotalValueUsd ?? 0;
      acc.totalPnl += pos.netProfitLossUsd ?? 0;
      acc.totalIl += pos.impermanentLossUsd ?? 0;
      return acc;
    },
    { totalValue: 0, totalPnl: 0, totalIl: 0 }
  ) ?? { totalValue: 0, totalPnl: 0, totalIl: 0 };

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
            Manage liquidity positions, calculate impermanent loss, and export tax data
          </p>
        </div>
      </div>

      {/* Total Stats */}
      {positions && positions.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">Total LP Value</div>
              <div className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100">
                {formatUsd(totalStats.totalValue)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">Total PnL</div>
              <div className={`text-2xl font-bold font-display ${totalStats.totalPnl >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {totalStats.totalPnl >= 0 ? '+' : ''}{formatUsd(totalStats.totalPnl)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
            <CardContent className="p-4">
              <div className="text-sm text-zinc-500">Total Impermanent Loss</div>
              <div className="text-2xl font-bold font-display text-[var(--color-danger)]">
                -{formatUsd(totalStats.totalIl)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            Tax Export
          </TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          {isLoading ? (
            <div className="rounded-xl border border-zinc-200 bg-white/80 p-8 text-center shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-[var(--color-primary)]"></div>
              <p className="mt-4 text-zinc-500">Loading LP positions...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              Error loading LP positions: {error}
            </div>
          ) : !positions || positions.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white/80 p-8 text-center shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
              <Coins className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                No LP Positions Found
              </h3>
              <p className="mt-2 text-zinc-500">
                {address 
                  ? 'This address has no active liquidity positions.'
                  : 'Connect a wallet to view your LP positions.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {positions.map((position) => (
                <LpSummaryCard key={position.pool} position={position} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* IL Calculator Tab */}
        <TabsContent value="calculator">
          <IlCalculator />
        </TabsContent>

        {/* Tax Export Tab */}
        <TabsContent value="tax-export">
          <TaxExport address={address} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
