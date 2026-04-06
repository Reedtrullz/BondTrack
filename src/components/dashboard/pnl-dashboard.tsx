'use client';

import { useMemo } from 'react';
import { BondPosition } from '@/lib/types/node';
import { calculatePricePnL, calculateTotalReturn, calculateOperatorFeePaid } from '@/lib/utils/calculations';
import { formatRuneAmount, runeToNumber } from '@/lib/utils/formatters';
import { TrendingUp, DollarSign, Percent, Wallet } from 'lucide-react';

interface PnLDashboardProps {
  positions: BondPosition[];
  currentRunePrice: number;
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

export function PnLDashboard({
  positions,
  currentRunePrice,
  entryRunePrice,
  earningsHistory,
  bondHistory,
}: PnLDashboardProps) {
  const totalBond = bondHistory?.initialBond ?? positions.reduce((sum, pos) => sum + pos.bondAmount, 0);
  const totalBondingEarnings = bondHistory?.bondGrowth ?? 0;
  const currentBond = bondHistory?.currentBond ?? totalBond + totalBondingEarnings;
  
  const effectiveEntryPrice = useMemo(() => 
    entryRunePrice || 
    (earningsHistory?.intervals[0] ? Number(earningsHistory.intervals[0].runePriceUSD) : currentRunePrice),
    [entryRunePrice, earningsHistory, currentRunePrice]
  );
  
  const initialBondValueUSD = useMemo(() => totalBond * effectiveEntryPrice, [totalBond, effectiveEntryPrice]);
  const currentBondValueUSD = useMemo(() => currentBond * currentRunePrice, [currentBond, currentRunePrice]);
  const pricePnL = useMemo(() => calculatePricePnL(totalBond, effectiveEntryPrice, currentRunePrice), [totalBond, effectiveEntryPrice, currentRunePrice]);
  const totalReturn = useMemo(() => calculateTotalReturn(totalBond, currentBond, effectiveEntryPrice, currentRunePrice), [totalBond, currentBond, effectiveEntryPrice, currentRunePrice]);
  const totalReturnPercent = useMemo(() => totalBond > 0 ? (totalReturn / initialBondValueUSD) * 100 : 0, [totalBond, totalReturn, initialBondValueUSD]);

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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-500">Profit & Loss</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <PnLCard
          icon={<Wallet className="w-4 h-4" />}
          label="Initial Bond"
          value={formatRuneAmount(String(Math.round(totalBond * 1e8)), 2)}
          subValue={`$${initialBondValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
          value={formatRuneAmount(String(Math.round(totalBondingEarnings * 1e8)), 2)}
          subValue={`+${((totalBondingEarnings / totalBond) * 100 || 0).toFixed(1)}%`}
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
  label: string;
  value: string;
  subValue?: string;
  positive?: boolean;
}) {
  const valueColor = positive === undefined 
    ? 'text-zinc-900 dark:text-zinc-100' 
    : positive 
      ? 'text-emerald-600 dark:text-emerald-400' 
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
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
