'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useLpPositions } from '@/lib/hooks/use-lp-positions';
import type { LpPosition } from '@/lib/types/lp';
import { rawRuneToDisplayNumber } from '@/lib/utils/formatters';
import { normalizeMidgardTimestampToDate } from '@/lib/utils/midgard-time';

interface TaxExportProps {
  address: string | null;
  isHistoricalEnrichmentLoading?: boolean;
}

function formatTaxPositionDate(rawTimestamp: string): string {
  return normalizeMidgardTimestampToDate(rawTimestamp)?.toISOString().split('T')[0] ?? 'Unknown';
}

function formatCsvCell(cell: string | number | null): string {
  return `"${String(cell ?? '').replace(/"/g, '""')}"`;
}

function rawBaseAmountToDisplayNumber(raw: string | number | undefined): number {
  return rawRuneToDisplayNumber(raw);
}

export default function TaxExport({ address, isHistoricalEnrichmentLoading: parentHistoricalEnrichmentLoading }: TaxExportProps) {
  const {
    positions,
    isLoading,
    isHistoricalEnrichmentLoading: hookHistoricalEnrichmentLoading,
    error,
  } = useLpPositions(address);
  const [exporting, setExporting] = useState(false);
  const isHistoricalEnrichmentLoading = Boolean(
    parentHistoricalEnrichmentLoading || hookHistoricalEnrichmentLoading
  );
  const positionsWithIncompleteHistoricalPricing = positions?.filter(
    (position) =>
      position.pricingSource !== 'historical' ||
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
      const exportedAt = new Date().toISOString();
      const headers = [
        'Exported At',
        'Pool',
        'Asset Symbol',
        'First Added Date',
        'Last Added Date',
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
        'Pricing Confidence',
        'Notes',
      ];

      const rows = positions.map((pos: LpPosition) => {
        const depositDate = formatTaxPositionDate(pos.dateFirstAdded);
        const withdrawalDate = pos.dateLastAdded
          ? formatTaxPositionDate(pos.dateLastAdded)
          : 'Open Position';

        const entryValue = pos.depositedTotalValueUsd ?? 0;
        const currentValue = pos.currentTotalValueUsd ?? 0;
        const pnl = pos.netProfitLossUsd ?? 0;
        const pnlPercent = pos.netProfitLossPercent ?? 0;
        const ilPercent = pos.impermanentLossPercent ?? 0;
        const ilUsd = pos.impermanentLossUsd ?? 0;

        return [
          exportedAt,
          pos.pool,
          pos.assetSymbol,
          depositDate,
          withdrawalDate,
          rawBaseAmountToDisplayNumber(pos.runeDeposit),
          rawBaseAmountToDisplayNumber(pos.asset2Deposit),
          rawBaseAmountToDisplayNumber(pos.runeWithdrawn),
          rawBaseAmountToDisplayNumber(pos.asset2Withdrawn),
          entryValue,
          currentValue,
          pnl,
          pnlPercent.toFixed(2),
          ilPercent.toFixed(2),
          ilUsd,
          pos.pricingSource,
          'LP position snapshot only; not a realized-tax ledger',
        ];
      });

      const csvContent = [
        headers.map(formatCsvCell).join(','),
        ...rows.map((row) => row.map(formatCsvCell).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `heimdall-lp-position-snapshot-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating LP position CSV:', err);
      alert('Failed to generate LP position CSV. Please try again.');
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
            Loading LP positions for CSV export...
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
              ? 'Connect a wallet to export an LP position snapshot.'
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
          LP Position CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Download a point-in-time LP position snapshot with deposits, withdrawals, PnL, and impermanent loss. This is not a complete tax report or realized-event ledger.
        </p>

        {isHistoricalEnrichmentLoading ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            Historical pricing is still enriching. LP CSV export is disabled until entry values, PnL, and impermanent loss are complete.
          </div>
        ) : hasIncompleteHistoricalPricing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Complete historical entry pricing is unavailable for {positionsWithIncompleteHistoricalPricing.length} position{positionsWithIncompleteHistoricalPricing.length !== 1 ? 's' : ''}. Estimated/current-only LP CSV export is disabled to avoid incomplete position data.
          </div>
        ) : null}

        <div className="flex items-end gap-4">
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
            <li>Export timestamp, pool, and asset symbol</li>
            <li>First/last add dates plus RUNE/asset deposit and withdrawal amounts</li>
            <li>Entry/current value, Net PnL, impermanent loss, and pricing confidence</li>
          </ul>
          <p className="mt-2 text-amber-600 dark:text-amber-400">
            Note: This CSV is a position snapshot only. It intentionally omits taxable-event classification because historical LP add/withdraw reconstruction is not implemented here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
