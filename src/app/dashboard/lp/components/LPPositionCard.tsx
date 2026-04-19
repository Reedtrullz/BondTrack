'use client';

import { memo, useMemo } from 'react';
import { formatRuneAmount } from '@/lib/utils/formatters';
import { formatPnlDisplay } from '@/lib/utils/calculations';
import { getAssetName } from '@/lib/utils/pool';
import { PoolStatusBadge } from './PoolStatusBadge';

// Constants
const EXPLORER_BASE_URL = 'https://thorchain.net';
const NINE_REALMS_BASE_URL = 'https://nine-realms.com';
const NANOSECONDS_PER_SECOND = 1e9;
const TIMESTAMP_THRESHOLD_NANOSECONDS = 1e12;
const DECIMAL_PLACES_PERCENTAGE = 2;
const DECIMAL_PLACES_APY = 2;

interface LPPosition {
  address: string;
  pool: string;
  runeDeposit: string;
  asset2Deposit: string;
  liquidityUnits: string;
  runeAdded: string;
  runePending: string;
  runeWithdrawn: string;
  asset2Added: string;
  asset2Pending: string;
  asset2Withdrawn: string;
  volume24h: string;
  runeDepth: string;
  asset2Depth: string;
  dateFirstAdded: number;
  dateLastAdded: number;
  poolApy: number;
  poolStatus: 'available' | 'staged' | 'suspended' | 'unknown';
  ownershipPercent: number;
  hasPending: boolean;
  runeDepositedValue: string;
  asset2DepositedValue: string;
  runeWithdrawable: string;
  asset2Withdrawable: string;
  netProfitLoss: string;
  netProfitLossPercent: number;
  impermanentLossPercent?: number;
  impermanentLossValue?: number;
}

export const LPPositionCard = memo(function LPPositionCard({ position }: { position: LPPosition }) {
  // Memoize expensive calculations
  const pnlDisplay = useMemo(() => formatPnlDisplay(position.netProfitLossPercent), [position.netProfitLossPercent]);
  const { rune, asset } = useMemo(() => getAssetName(position.pool), [position.pool]);
  const ownershipDisplay = useMemo(() => 
    Number.isFinite(position.ownershipPercent) ? `${position.ownershipPercent.toFixed(DECIMAL_PLACES_PERCENTAGE)}%` : '0.00%',
    [position.ownershipPercent]
  );
  const liquidityUnitsDisplay = useMemo(() => {
    try {
      return BigInt(position.liquidityUnits).toLocaleString('en-US');
    } catch {
      return '0';
    }
  }, [position.liquidityUnits]);

  // Generate external links
  const explorerUrl = useMemo(() => 
    `${EXPLORER_BASE_URL}/pool/${position.pool}`,
    [position.pool]
  );
  
  const nineRealmsUrl = useMemo(() => 
    `${NINE_REALMS_BASE_URL}/pool/${position.pool}`,
    [position.pool]
  );

  // Export functionality
  const handleExportCSV = () => {
    const headers = ['Pool', 'Status', 'Ownership %', 'LP Units', 'RUNE Deposited', `${asset} Deposited`, 'Net PnL', 'PnL %', 'Pool APY'];
    const row = [
      position.pool,
      position.poolStatus,
      ownershipDisplay,
      liquidityUnitsDisplay,
      position.runeDeposit,
      position.asset2Deposit,
      position.netProfitLoss,
      `${position.netProfitLossPercent.toFixed(DECIMAL_PLACES_PERCENTAGE)}%`,
      `${position.poolApy.toFixed(DECIMAL_PLACES_APY)}%`
    ];
    
    const csvContent = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lp-position-${position.pool.replace('/', '-')}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(position, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lp-position-${position.pool.replace('/', '-')}.json`;
    link.click();
  };

  return (
    <article 
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      aria-label={`Liquidity pool position for ${position.pool}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Pool
          </p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400 transition-colors"
            aria-label={`View ${position.pool} on THORChain explorer (opens in new tab)`}
          >
            {position.pool}
          </a>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Ownership {ownershipDisplay} · LP Units {liquidityUnitsDisplay}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PoolStatusBadge status={position.poolStatus} />
          {position.hasPending && (
            <span 
              className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              role="status"
              aria-live="polite"
            >
              Pending Add
            </span>
          )}
        </div>
      </div>
      
      {/* External links and export buttons */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Pool actions">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label={`View ${position.pool} on THORChain explorer (opens in new tab)`}
        >
          THORChain Explorer
        </a>
        <a
          href={nineRealmsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label={`View ${position.pool} on Nine Realms (opens in new tab)`}
        >
          Nine Realms
        </a>
        <button
          onClick={handleExportCSV}
          className="rounded px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label={`Export ${position.pool} position data as CSV file`}
        >
          Export CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="rounded px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label={`Export ${position.pool} position data as JSON file`}
        >
          Export JSON
        </button>
      </div>
      
      {/* Responsive wrapper for metrics grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-[600px]" role="list" aria-label="Pool position metrics">
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{rune} Deposited</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`${rune} deposited amount: ${formatRuneAmount(position.runeDeposit)}`}>
              {formatRuneAmount(position.runeDeposit)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Deposited</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`${asset} deposited amount: ${formatRuneAmount(position.asset2Deposit)}`}>
              {formatRuneAmount(position.asset2Deposit)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{rune} Withdrawable</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400" aria-label={`${rune} withdrawable amount: ${formatRuneAmount(position.runeWithdrawable)}`}>
              {formatRuneAmount(position.runeWithdrawable)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Withdrawable</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400" aria-label={`${asset} withdrawable amount: ${formatRuneAmount(position.asset2Withdrawable)}`}>
              {formatRuneAmount(position.asset2Withdrawable)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Net Profit/Loss</p>
            <p className={`text-xl font-semibold ${pnlDisplay.color}`} aria-label={`Net profit or loss: ${position.netProfitLoss}`}>
              {position.netProfitLoss}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">PnL Percentage</p>
            <p className={`text-xl font-semibold ${pnlDisplay.color}`} aria-label={`Profit or loss percentage: ${position.netProfitLossPercent.toFixed(DECIMAL_PLACES_PERCENTAGE)}%`}>
              {position.netProfitLossPercent.toFixed(DECIMAL_PLACES_PERCENTAGE)}%
            </p>
          </div>
          {position.impermanentLossPercent !== undefined && (
            <>
              <div role="listitem">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Impermanent Loss</p>
                <p className={`text-xl font-semibold ${position.impermanentLossPercent < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} aria-label={`Impermanent loss: ${position.impermanentLossPercent.toFixed(DECIMAL_PLACES_PERCENTAGE)}%`}>
                  {position.impermanentLossPercent.toFixed(DECIMAL_PLACES_PERCENTAGE)}%
                </p>
              </div>
            </>
          )}
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pool APY</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400" aria-label={`Pool annual percentage yield: ${position.poolApy.toFixed(DECIMAL_PLACES_APY)}%`}>
              {position.poolApy.toFixed(DECIMAL_PLACES_APY)}%
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">24H Volume</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`24 hour trading volume: ${formatRuneAmount(position.volume24h)}`}>
              {formatRuneAmount(position.volume24h)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pool Depth</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Total pool depth: ${formatRuneAmount(position.runeDepth)}`}>
              {formatRuneAmount(position.runeDepth)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{rune} Added</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Total ${rune} added: ${formatRuneAmount(position.runeAdded)}`}>
              {formatRuneAmount(position.runeAdded)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{rune} Withdrawn</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Total ${rune} withdrawn: ${formatRuneAmount(position.runeWithdrawn)}`}>
              {formatRuneAmount(position.runeWithdrawn)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Added</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Total ${asset} added: ${formatRuneAmount(position.asset2Added)}`}>
              {formatRuneAmount(position.asset2Added)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset} Withdrawn</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Total ${asset} withdrawn: ${formatRuneAmount(position.asset2Withdrawn)}`}>
              {formatRuneAmount(position.asset2Withdrawn)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">First Added</p>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`First deposit date: ${formatDate(position.dateFirstAdded)}`}>
              {formatDate(position.dateFirstAdded)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Last Added</p>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Last deposit date: ${formatDate(position.dateLastAdded)}`}>
              {formatDate(position.dateLastAdded)}
            </p>
          </div>
          <div role="listitem">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending Amount</p>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100" aria-label={`Pending amount: ${position.hasPending ? `${formatRuneAmount(position.runePending)} plus ${formatRuneAmount(position.asset2Pending)}` : 'None'}`}>
              {position.hasPending ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {formatRuneAmount(position.runePending)} + {formatRuneAmount(position.asset2Pending)}
                </span>
              ) : (
                '--'
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
});

function formatDate(timestamp: number): string {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return '--';
  return new Date(ts > TIMESTAMP_THRESHOLD_NANOSECONDS ? ts / NANOSECONDS_PER_SECOND : ts).toLocaleDateString();
}
