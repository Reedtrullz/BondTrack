'use client';

import { useState, useMemo, useEffect } from 'react';
import { BondPosition } from '@/lib/types/node';
import { calculatePricePnL, calculateTotalReturn } from '@/lib/utils/calculations';
import { TrendingUp, DollarSign, Percent, Wallet, Edit3, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import {
  getEntryPriceStorageKey,
  getInitialBondStorageKey,
  readLocalStorageValue,
  removeLocalStorageValue,
  writeLocalStorageValue,
} from '@/lib/storage/keys';

interface PnLDashboardProps {
  positions: BondPosition[];
  currentRunePrice: number;
  currentRunePriceIsStale?: boolean;
  currentRunePriceUpdatedAt?: Date | null;
  address: string | null;
  entryRunePrice?: number;
  earningsHistory?: {
    intervals: {
      bondingEarnings: string;
      runePriceUSD: string;
      earnings?: string;
    }[];
  };
  bondHistory?: {
    initialBond: number;
    currentBond: number;
    bondGrowth: number;
    firstBondDate?: Date | null;
  } | null;
  actionsError?: { message?: string } | null;
  isLoadingActions?: boolean;
}

function getStorageKey(address: string | null): string | null {
  return getInitialBondStorageKey(address);
}

function getEntryPriceKey(address: string | null): string {
  return getEntryPriceStorageKey(address) ?? '';
}

function parsePositivePrice(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatUsdValue(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const manualInitialBondInputId = 'pnl-manual-initial-bond';
const manualInitialBondHelpId = 'pnl-manual-initial-bond-help';
const manualEntryPriceInputId = 'pnl-manual-entry-price';
const manualEntryPriceHelpId = 'pnl-manual-entry-price-help';

export function PnLDashboard({
  positions,
  currentRunePrice,
  currentRunePriceIsStale = false,
  currentRunePriceUpdatedAt,
  address,
  entryRunePrice,
  earningsHistory,
  bondHistory,
  actionsError,
  isLoadingActions,
}: PnLDashboardProps) {
  const storageKey = getStorageKey(address);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [manualEntryPrice, setManualEntryPrice] = useState<number | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInputValue, setPriceInputValue] = useState('');
  const [manualInitialBond, setManualInitialBond] = useState<number | null>(null);

  useEffect(() => {
    setManualInitialBond(null);
    setInputValue('');
    setIsEditing(false);

    if (!storageKey) {
      return;
    }

    const saved = readLocalStorageValue(storageKey);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        setManualInitialBond(parsed);
        writeLocalStorageValue(storageKey, parsed.toString());
      }
    }
  }, [storageKey, address]);

  const entryPriceKey = getEntryPriceKey(address);
  useEffect(() => {
    setManualEntryPrice(null);
    setPriceInputValue('');
    setIsEditingPrice(false);

    if (!entryPriceKey) {
      return;
    }

    const saved = readLocalStorageValue(entryPriceKey);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        setManualEntryPrice(parsed);
        writeLocalStorageValue(entryPriceKey, parsed.toString());
      }
    }
  }, [entryPriceKey, address]);

  const startEditing = () => {
    setInputValue(manualInitialBond?.toString() ?? '');
    setIsEditing(true);
  };

  const saveValue = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0 && storageKey) {
      setManualInitialBond(parsed);
      writeLocalStorageValue(storageKey, parsed.toString());
    }
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const clearValue = () => {
    if (storageKey) {
      removeLocalStorageValue(storageKey);
    }
    setManualInitialBond(null);
    setIsEditing(false);
  };

  const startEditingPrice = () => {
    setPriceInputValue(manualEntryPrice?.toString() ?? entryRunePrice?.toString() ?? '');
    setIsEditingPrice(true);
  };

  const savePriceValue = () => {
    const parsed = parseFloat(priceInputValue);
    if (!isNaN(parsed) && parsed > 0 && entryPriceKey) {
      setManualEntryPrice(parsed);
      writeLocalStorageValue(entryPriceKey, parsed.toString());
    }
    setIsEditingPrice(false);
  };

  const cancelEditingPrice = () => {
    setIsEditingPrice(false);
  };

  const totalCurrentBond = positions?.reduce((sum, pos) => sum + pos.bondAmount, 0) ?? 0;
  const historicalCurrentBond = bondHistory?.currentBond ?? 0;
  const currentBond = historicalCurrentBond > 0 ? historicalCurrentBond : totalCurrentBond;

  const hasManualInitialBond = manualInitialBond !== null;
  const hasActionInitialBond = (bondHistory?.initialBond ?? 0) > 0;
  const hasHistoricalInitialBond = hasManualInitialBond || hasActionInitialBond;
  const effectiveInitialBond = manualInitialBond ?? (hasActionInitialBond ? bondHistory?.initialBond ?? 0 : 0);
  
  const currentRunePriceValue = parsePositivePrice(currentRunePrice);
  const earningsHistoryEntryPrice = parsePositivePrice(earningsHistory?.intervals?.[0]?.runePriceUSD);
  const historicalEntryPrice = parsePositivePrice(entryRunePrice);
  const effectiveEntryPrice = manualEntryPrice
    ?? historicalEntryPrice
    ?? earningsHistoryEntryPrice
    ?? currentRunePriceValue;

  const entryPriceDisplay = useMemo<number | null>(() => {
    if (manualEntryPrice) return manualEntryPrice;
    if (historicalEntryPrice) return historicalEntryPrice;
    if (earningsHistoryEntryPrice) return earningsHistoryEntryPrice;
    return currentRunePriceValue;
  }, [manualEntryPrice, historicalEntryPrice, earningsHistoryEntryPrice, currentRunePriceValue]);
  const currentRunePriceTrustLabel = currentRunePriceIsStale
    ? `Current RUNE price stale${currentRunePriceUpdatedAt ? ` · updated ${currentRunePriceUpdatedAt.toLocaleString()}` : ''}`
    : null;
  const canCalculateReturn = hasHistoricalInitialBond && effectiveInitialBond > 0 && effectiveEntryPrice !== null && currentRunePriceValue !== null;
  
  const initialBondValueUSD = useMemo(
    () => effectiveEntryPrice !== null ? effectiveInitialBond * effectiveEntryPrice : null,
    [effectiveInitialBond, effectiveEntryPrice]
  );
  const currentBondValueUSD = useMemo(
    () => currentRunePriceValue !== null ? currentBond * currentRunePriceValue : null,
    [currentBond, currentRunePriceValue]
  );
  const pricePnL = useMemo(
    () => canCalculateReturn ? calculatePricePnL(effectiveInitialBond, effectiveEntryPrice, currentRunePriceValue) : null,
    [canCalculateReturn, effectiveInitialBond, effectiveEntryPrice, currentRunePriceValue]
  );
  const totalReturn = useMemo(
    () => canCalculateReturn ? calculateTotalReturn(effectiveInitialBond, currentBond, effectiveEntryPrice, currentRunePriceValue) : null,
    [canCalculateReturn, effectiveInitialBond, currentBond, effectiveEntryPrice, currentRunePriceValue]
  );
  const totalReturnPercent = useMemo(
    () => canCalculateReturn && initialBondValueUSD !== null && initialBondValueUSD > 0 && totalReturn !== null
      ? (totalReturn / initialBondValueUSD) * 100
      : null,
    [canCalculateReturn, totalReturn, initialBondValueUSD]
  );

  const bondGrowth = currentBond - effectiveInitialBond;
  const bondGrowthPercent = effectiveInitialBond > 0 ? (bondGrowth / effectiveInitialBond) * 100 : 0;
  const bondGrowthPercentDisplay = `${bondGrowthPercent >= 0 ? '+' : ''}${bondGrowthPercent.toFixed(1)}%`;
  const missingBaselineDetail = isLoadingActions
    ? 'Loading action history'
    : actionsError
      ? 'History unavailable; set manually'
      : 'Set initial bond to track';
  const initialBondSource = manualInitialBond !== null
    ? 'manual override'
    : hasActionInitialBond
      ? 'action history'
      : isLoadingActions
        ? 'loading action history'
        : actionsError
          ? 'history unavailable'
          : 'missing baseline';
  const entryPriceSource = manualEntryPrice
    ? 'manual override'
    : historicalEntryPrice
      ? 'historical RUNE price'
      : earningsHistoryEntryPrice
        ? 'earnings history'
        : currentRunePriceValue
          ? 'current price fallback'
          : 'missing quote';
  const currentPriceSource = currentRunePriceValue === null
    ? 'missing quote'
    : currentRunePriceIsStale
      ? 'stale'
      : 'current quote';
  const initialBondUsdDisplay = formatUsdValue(initialBondValueUSD);
  const initialBondSubValue = hasHistoricalInitialBond
    ? initialBondUsdDisplay
      ? `${initialBondUsdDisplay}${manualInitialBond !== null ? ' (manual)' : ''}`
      : 'Entry price unavailable'
    : missingBaselineDetail;
  const currentBondSubValue = formatUsdValue(currentBondValueUSD) ?? 'Current price unavailable';
  const unavailableReturnDetail = !hasHistoricalInitialBond
    ? missingBaselineDetail
    : effectiveEntryPrice === null
      ? 'Entry price unavailable'
      : currentRunePriceValue === null
        ? 'Current price unavailable'
        : missingBaselineDetail;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-500">Profit & Loss</h3>
      {currentRunePriceTrustLabel ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {currentRunePriceTrustLabel}. Price PnL and total return use the last Midgard price.
        </div>
      ) : null}

      <section
        aria-label="PnL calculation basis"
        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">Initial bond:</span> {initialBondSource}
          </span>
          <span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">Entry price:</span> {entryPriceSource}
          </span>
          <span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">Current price:</span> {currentPriceSource}
          </span>
        </div>
      </section>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4" aria-label="PnL return cards">
        <PnLCard
          icon={<Wallet className="w-4 h-4" />}
          label={
            <span className="flex items-center gap-1">
              Initial Bond
              {isLoadingActions && (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400 ml-1" />
              )}
              {actionsError && !manualInitialBond && (
                <span
                  role="img"
                  aria-label="Action history unavailable; set an initial bond manually to calculate returns."
                  title={`History unavailable: ${actionsError.message || 'API error'}. Set an initial bond manually to calculate returns.`}
                >
                  <AlertTriangle 
                    className="w-3 h-3 text-amber-500 ml-1 cursor-help" 
                  />
                </span>
              )}
              {isEditing ? (
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={saveValue}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Save initial bond override"
                    title="Save"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Cancel initial bond override"
                    title="Cancel"
                  >
                    <X className="w-3 h-3 text-zinc-400" />
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={startEditing}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Edit initial bond"
                    title="Edit initial bond"
                  >
                    <Edit3 className="w-3 h-3 text-zinc-400" />
                  </button>
                  {manualInitialBond !== null && (
                    <button
                      onClick={clearValue}
                      className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      aria-label="Clear manual initial bond"
                      title="Clear manual value (use auto)"
                    >
                      <X className="w-3 h-3 text-zinc-400" />
                    </button>
                  )}
                </span>
              )}
            </span>
          }
          value={
            isEditing ? (
              <>
                <label htmlFor={manualInitialBondInputId} className="sr-only">Manual initial bond amount</label>
                <input
                  id={manualInitialBondInputId}
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveValue();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  aria-describedby={manualInitialBondHelpId}
                  className="w-full bg-transparent text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 outline-none border-b border-zinc-400 dark:border-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                  placeholder="Enter RUNE amount"
                  autoFocus
                  min="0"
                  step="0.01"
                />
                <span id={manualInitialBondHelpId} className="sr-only">
                  Overrides the action-history baseline for this browser only.
                </span>
              </>
            ) : hasHistoricalInitialBond ? (
              effectiveInitialBond.toFixed(2)
            ) : 'N/A'
          }
          subValue={hasHistoricalInitialBond
            ? initialBondSubValue
            : missingBaselineDetail}
        />
        <PnLCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Current Bond"
          value={currentBond.toFixed(2)}
          subValue={currentBondSubValue}
        />
        <PnLCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Bond Growth"
          value={hasHistoricalInitialBond ? bondGrowth.toFixed(2) : 'N/A'}
          subValue={hasHistoricalInitialBond ? bondGrowthPercentDisplay : 'Set initial bond to track'}
          positive={hasHistoricalInitialBond ? bondGrowth >= 0 : undefined}
        />
        <PnLCard
          icon={<DollarSign className="w-4 h-4" />}
          label={
            <span className="flex items-center gap-1">
              Price PnL
              {isEditingPrice ? (
                <span className="flex items-center gap-0.5 ml-1">
                  <input
                    id={manualEntryPriceInputId}
                    type="number"
                    step="0.0001"
                    value={priceInputValue}
                    onChange={(e) => setPriceInputValue(e.target.value)}
                    aria-describedby={manualEntryPriceHelpId}
                    className="w-20 px-1 py-0.5 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-700"
                    placeholder="Entry price"
                  />
                  <label htmlFor={manualEntryPriceInputId} className="sr-only">Manual RUNE entry price</label>
                  <span id={manualEntryPriceHelpId} className="sr-only">
                    Overrides the entry price used for Price PnL in this browser only.
                  </span>
                  <button
                    onClick={savePriceValue}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    aria-label="Save RUNE entry price override"
                    title="Save"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                  </button>
                  <button
                    onClick={cancelEditingPrice}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    aria-label="Cancel RUNE entry price override"
                    title="Cancel"
                  >
                    <X className="w-3 h-3 text-zinc-400" />
                  </button>
                </span>
              ) : (
                <button
                  onClick={startEditingPrice}
                  className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  aria-label="Edit RUNE entry price"
                  title="Edit entry price"
                >
                  <Edit3 className="w-3 h-3 text-zinc-400" />
                </button>
              )}
            </span>
          }
          value={pricePnL !== null
            ? `$${pricePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'N/A'}
          subValue={pricePnL !== null
            ? `Entry: $${entryPriceDisplay?.toFixed(4)} → $${currentRunePriceValue?.toFixed(4)}${currentRunePriceIsStale ? ' (stale)' : ''}`
            : unavailableReturnDetail}
          positive={pricePnL !== null ? pricePnL >= 0 : undefined}
        />
        <PnLCard
          icon={<Percent className="w-4 h-4" />}
          label="Total Return"
          value={totalReturn !== null
            ? `$${totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'N/A'}
          subValue={totalReturnPercent !== null
            ? `${totalReturnPercent >= 0 ? '+' : ''}${totalReturnPercent.toFixed(2)}%`
            : unavailableReturnDetail}
          positive={totalReturn !== null ? totalReturn >= 0 : undefined}
        />
      </div>
    </div>
  );
}

function PnLCard({
  icon,
  label,
  value,
  subValue,
  positive,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  subValue?: string;
  positive?: boolean;
}) {
  const valueColor = positive === undefined 
    ? 'text-zinc-900 dark:text-zinc-100' 
    : positive 
      ? 'text-emerald-600 dark:text-emerald-400' 
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-500 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-lg font-semibold font-mono ${valueColor}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-zinc-500 mt-1 font-mono">
          {subValue}
        </div>
      )}
    </div>
  );
}
