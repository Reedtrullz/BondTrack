'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import type { LpPosition } from '@/lib/types/lp';
import { runeToNumber } from '@/lib/utils/formatters';

interface TaxExportProps {
  address: string | null;
  isHistoricalEnrichmentLoading?: boolean;
}

export default function TaxExport({ address, isHistoricalEnrichmentLoading: parentHistoricalEnrichmentLoading }: TaxExportProps) {
  const {
    positions,
    isLoading,
    isHistoricalEnrichmentLoading: hookHistoricalEnrichmentLoading,
    error,
  } = useLpPositions(address);
  const [exporting, setExporting] = useState(false);
  const [taxYear, setTaxYear] = useState<string>(new Date().getFullYear().toString());
  const isHistoricalEnrichmentLoading = Boolean(
    parentHistoricalEnrichmentLoading || hookHistoricalEnrichmentLoading
  );
  const positionsWithIncompleteHistoricalPricing = positions?.filter(
    (position) =>
      position.pricingSource === 'current-only' ||
      position.depositedTotalValueUsd === null ||
      position.netProfitLossUsd === null ||
      position.impermanentLossUsd === null
  ) ?? [];
  const hasIncompleteHistoricalPricing = positionsWithIncompleteHistoricalPricing.length > 0;
  const isExportDisabled = exporting
    || !positions
    || positions.length === 0
    || isHistoricalEnrichmentLoading
    || hasIncompleteHistoricalPricing;

  const generateCsv = () => {
    if (isExportDisabled) return;

    setExporting(true);

    try {
      // CSV headers
      const headers = [
        'Tax Year',
        'Pool',
        'Asset Symbol',
        'Deposit Date',
        'Withdrawal Date',
        'RUNE Deposited',
        'Asset Deposited',
        'RUNE Withdrawn',
        'Asset Withdrawn',
        'Entry Value (USD)',
        'Current Value (USD)',
        'Net PnL (USD)',
        'PnL Percent (%)',
        'Impermanent Loss (%)',
        'Impermanent Loss (USD)',
        'Taxable Event',
        'Notes',
      ];

      // Generate CSV rows
      const rows = positions.map((pos: LpPosition) => {
        const depositDate = pos.dateFirstAdded 
          ? new Date(parseInt(pos.dateFirstAdded) * 1000).toISOString().split('T')[0]
          : 'Unknown';
        const withdrawalDate = pos.dateLastAdded
          ? new Date(parseInt(pos.dateLastAdded) * 1000).toISOString().split('T')[0]
          : 'Open Position';

        const entryValue = pos.depositedTotalValueUsd ?? 0;
        const currentValue = pos.currentTotalValueUsd ?? 0;
        const pnl = pos.netProfitLossUsd ?? 0;
        const pnlPercent = pos.netProfitLossPercent ?? 0;
        const ilPercent = pos.impermanentLossPercent ?? 0;
        const ilUsd = pos.impermanentLossUsd ?? 0;

        // Simple taxable event logic (mock)
        const taxableEvent = pnl > 0 ? 'Capital Gain' : pnl < 0 ? 'Capital Loss' : 'No Gain/Loss';

        return [
          taxYear,
          pos.pool,
          pos.assetSymbol,
          depositDate,
          withdrawalDate,
          runeToNumber(pos.runeDeposit),
          parseFloat(pos.asset2Deposit) || 0,
          runeToNumber(pos.runeWithdrawn),
          parseFloat(pos.asset2Withdrawn) || 0,
          entryValue,
          currentValue,
          pnl,
          pnlPercent.toFixed(2),
          ilPercent.toFixed(2),
          ilUsd,
          taxableEvent,
          'LP Position ' + (pnl > 0 ? 'Profit' : 'Loss'),
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bondsense-lp-tax-export-${taxYear}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating CSV:', err);
      alert('Failed to generate tax export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading LP positions for tax export...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !positions || positions.length === 0) {
    return (
      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardContent className="p-6">
          <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800/50">
            {!address 
              ? 'Connect a wallet to export LP tax data.'
              : error 
                ? 'Error loading LP positions: ' + error
                : 'No LP positions found for this address.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <FileSpreadsheet className="h-5 w-5 text-[var(--color-primary)]" />
          LP Tax Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Export your LP position data as a CSV file for tax reporting. Includes deposits, withdrawals, PnL, and impermanent loss data.
        </p>

        {isHistoricalEnrichmentLoading ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            Historical pricing is still enriching. LP CSV export is disabled until entry values, PnL, and impermanent loss are complete.
          </div>
        ) : hasIncompleteHistoricalPricing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Historical entry pricing is unavailable for {positionsWithIncompleteHistoricalPricing.length} position{positionsWithIncompleteHistoricalPricing.length !== 1 ? 's' : ''}. LP CSV export is disabled to avoid incomplete tax data.
          </div>
        ) : null}

        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <label htmlFor="tax-year" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tax Year
            </label>
            <input
              id="tax-year"
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              min="2020"
              max={new Date().getFullYear() + 1}
            />
          </div>

          <Button 
            onClick={generateCsv}
            disabled={isExportDisabled}
            className="gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : isHistoricalEnrichmentLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enriching historical pricing...
              </>
            ) : hasIncompleteHistoricalPricing ? (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Historical pricing unavailable
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export CSV ({positions.length} positions)
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-zinc-50 p-4 text-xs text-zinc-500 dark:bg-zinc-800/50">
          <p className="font-medium">Included Columns:</p>
          <ul className="mt-1 list-disc pl-4">
            <li>Tax Year, Pool, Asset Symbol</li>
            <li>Deposit/Withdrawal Dates, RUNE/Asset Amounts</li>
            <li>Entry/Current Value (USD), Net PnL, Impermanent Loss</li>
            <li>Taxable Event Classification (mock)</li>
          </ul>
          <p className="mt-2 text-yellow-600 dark:text-yellow-400">
            Note: This is a mock tax export for demonstration. Consult a tax professional for actual reporting requirements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
