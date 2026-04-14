'use client';

import { useState, useMemo, useEffect } from 'react';
import { BondPosition } from '@/lib/types/node';
import { calculatePricePnL, calculateTotalReturn, calculateOperatorFeePaid } from '@/lib/utils/calculations';
import { formatRuneAmount, runeToNumber } from '@/lib/utils/formatters';
import { TrendingUp, DollarSign, Percent, Wallet, Edit3, Check, X } from 'lucide-react';

interface PnLDashboardProps {
  positions: BondPosition[];
  currentRunePrice: number;
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
  } | null;
}

function getStorageKey(address: string | null): string | null {
  if (!address) return null;
  return `bondtrack-initial-bond-${address}`;
}

export function PnLDashboard({
  positions,
  currentRunePrice,
  address,
  entryRunePrice,
  earningsHistory,
  bondHistory,
}: PnLDashboardProps) {
  const storageKey = getStorageKey(address);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [manualInitialBond, setManualInitialBond] = useState<number | null>(null);

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) {
          setManualInitialBond(parsed);
        }
      }
    }
  }, [storageKey]);

  const startEditing = () => {
    setInputValue(manualInitialBond?.toString() ?? '');
    setIsEditing(true);
  };

  const saveValue = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0 && storageKey) {
      setManualInitialBond(parsed);
      localStorage.setItem(storageKey, parsed.toString());
    }
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const clearValue = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setManualInitialBond(null);
    setIsEditing(false);
  };

  const effectiveInitialBond = manualInitialBond ?? (bondHistory?.initialBond ?? (positions?.reduce((sum, pos) => sum + pos.bondAmount, 0) ?? 0));
  const totalBondingEarnings = bondHistory?.currentBond ?? ((positions?.reduce((sum, pos) => sum + pos.bondAmount, 0) ?? 0) + (bondHistory?.bondGrowth ?? 0));
  const currentBond = bondHistory?.currentBond ?? (effectiveInitialBond + totalBondingEarnings - effectiveInitialBond);
  
  const effectiveEntryPrice = useMemo(() => 
    entryRunePrice || 
    (earningsHistory?.intervals?.length ? Number(earningsHistory.intervals[0].runePriceUSD) : currentRunePrice),
    [entryRunePrice, earningsHistory, currentRunePrice]
  );
  
  const initialBondValueUSD = useMemo(() => effectiveInitialBond * effectiveEntryPrice, [effectiveInitialBond, effectiveEntryPrice]);
  const currentBondValueUSD = useMemo(() => currentBond * currentRunePrice, [currentBond, currentRunePrice]);
  const pricePnL = useMemo(() => calculatePricePnL(effectiveInitialBond, effectiveEntryPrice, currentRunePrice), [effectiveInitialBond, effectiveEntryPrice, currentRunePrice]);
  const totalReturn = useMemo(() => calculateTotalReturn(effectiveInitialBond, currentBond, effectiveEntryPrice, currentRunePrice), [effectiveInitialBond, currentBond, effectiveEntryPrice, currentRunePrice]);
  const totalReturnPercent = useMemo(() => effectiveInitialBond > 0 ? (totalReturn / initialBondValueUSD) * 100 : 0, [effectiveInitialBond, totalReturn, initialBondValueUSD]);

  const totalEarnings = useMemo(() => 
    earningsHistory?.intervals.reduce((sum, interval) => {
      return sum + runeToNumber(interval.earnings || interval.bondingEarnings);
    }, 0) || 0,
    [earningsHistory]
  );
  
  const avgOperatorFeeBps = useMemo(() => 
    positions.length > 0 
      ? positions.reduce((sum, pos) => sum + (pos.operatorFee || 1000), 0) / positions.length
      : 1000,
    [positions]
  );
  const operatorFeePaid = useMemo(() => calculateOperatorFeePaid(totalEarnings, avgOperatorFeeBps), [totalEarnings, avgOperatorFeeBps]);

  const bondGrowth = currentBond - effectiveInitialBond;
  const bondGrowthPercent = effectiveInitialBond > 0 ? (bondGrowth / effectiveInitialBond) * 100 : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-500">Profit & Loss</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <PnLCard
          icon={<Wallet className="w-4 h-4" />}
          label={
            <span className="flex items-center gap-1">
              Initial Bond
              {isEditing ? (
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={saveValue}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Save"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
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
                    title="Edit initial bond"
                  >
                    <Edit3 className="w-3 h-3 text-zinc-400" />
                  </button>
                  {manualInitialBond !== null && (
                    <button
                      onClick={clearValue}
                      className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
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
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveValue();
                  if (e.key === 'Escape') cancelEditing();
                }}
                className="w-full bg-transparent text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 outline-none border-b border-zinc-400 dark:border-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                placeholder="Enter RUNE amount"
                autoFocus
                min="0"
                step="0.01"
              />
            ) : (
              formatRuneAmount(String(Math.round(effectiveInitialBond * 1e8)), 2)
            )
          }
          subValue={`$${initialBondValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${manualInitialBond !== null ? ' (manual)' : ''}`}
        />
        <PnLCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Current Bond"
          value={formatRuneAmount(String(Math.round(currentBond * 1e8)), 2)}
          subValue={`$${currentBondValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <PnLCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Bond Growth"
          value={formatRuneAmount(String(Math.round(bondGrowth * 1e8)), 2)}
          subValue={`+${bondGrowthPercent.toFixed(1)}%`}
          positive
        />
        <PnLCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Price PnL"
          value={`$${pricePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`Entry: $${effectiveEntryPrice.toFixed(4)} → $${currentRunePrice.toFixed(4)}`}
          positive={pricePnL >= 0}
        />
        <PnLCard
          icon={<Percent className="w-4 h-4" />}
          label="Total Return"
          value={`$${totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`${totalReturnPercent >= 0 ? '+' : ''}${totalReturnPercent.toFixed(2)}%`}
          positive={totalReturn >= 0}
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
