'use client';

import { useMemo } from 'react';
import { BarChart3, Coins, DollarSign, TrendingUp } from 'lucide-react';
import type { NetworkRaw, PoolDetailRaw } from '@/lib/api/midgard';
import { formatPercent, formatRuneAmount, formatUsd, runeToNumber } from '@/lib/utils/formatters';
import { normalizeApy } from '@/lib/utils/fee-calculations';

interface MarketOverviewProps {
  pools: PoolDetailRaw[];
  network: NetworkRaw | null;
  runePrice: number;
  isLoading?: boolean;
  runePriceChange24h?: number | null;
  runePriceChange7d?: number | null;
}

export function MarketOverview({ pools, network, runePrice, isLoading, runePriceChange24h, runePriceChange7d }: MarketOverviewProps) {
  const topPools = useMemo(
    () => [...pools].sort((a, b) => runeToNumber(b.volume24h) - runeToNumber(a.volume24h)).slice(0, 5),
    [pools],
  );

  const totalVolumeUsd = useMemo(
    () => pools.reduce((sum, pool) => sum + runeToNumber(pool.volume24h) * runePrice, 0),
    [pools, runePrice],
  );

  const totalTvlUsd = network ? runeToNumber(network.totalPooledRune) * runePrice : 0;
  const maxVolume = topPools.reduce((max, pool) => Math.max(max, runeToNumber(pool.volume24h) * runePrice), 0);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="space-y-5">
          <div className="h-6 w-44 rounded bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="h-72 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
            <div className="h-72 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (!network || pools.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">Market Overview</span>
        </div>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Market data is temporarily unavailable.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Market Overview</h2>
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Network liquidity, volume, and pool performance at a glance.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} label="24H Volume" value={formatUsd(totalVolumeUsd, 0)} subValue="Across all pools" />
        <KpiCard icon={<Coins className="h-4 w-4 text-cyan-500" />} label="Total TVL" value={formatUsd(totalTvlUsd, 0)} subValue={formatRuneAmount(String(Math.round(runeToNumber(network.totalPooledRune) * 1e8)))} />
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-amber-500" />}
          label="RUNE Price"
          value={formatUsd(runePrice, 4)}
          subValue={`${formatChange(runePriceChange24h)} 24h | ${formatChange(runePriceChange7d)} 7d`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top 5 Pools by Volume</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-white/70 dark:bg-zinc-900/70">
                <tr className="text-left text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  <th className="px-4 py-3 font-semibold">Pool</th>
                  <th className="px-4 py-3 font-semibold">Volume 24h</th>
                  <th className="px-4 py-3 font-semibold">Depth</th>
                  <th className="px-4 py-3 font-semibold">APY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {topPools.map((pool) => {
                  const volumeUsd = runeToNumber(pool.volume24h) * runePrice;
                  const depthRune = calculateDepthRuneEquivalent(pool, runePrice);

                  return (
                    <tr key={pool.asset} className="text-sm text-zinc-700 dark:text-zinc-300">
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{pool.asset}</td>
                      <td className="px-4 py-3">{formatUsd(volumeUsd, 0)}</td>
                      <td className="px-4 py-3">{formatRuneAmount(String(Math.round(depthRune * 1e8)))}</td>
                      <td className="px-4 py-3">{formatPercent(getPoolApy(pool), 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Volume Distribution</h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Top 5</span>
          </div>
          <div className="mt-4 space-y-4">
            {topPools.map((pool) => {
              const volumeUsd = runeToNumber(pool.volume24h) * runePrice;
              const width = maxVolume > 0 ? Math.max((volumeUsd / maxVolume) * 100, 6) : 0;

              return (
                <div key={pool.asset}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{pool.asset}</span>
                    <span>{formatUsd(volumeUsd, 0)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subValue}</p>
    </div>
  );
}

function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return `${value >= 0 ? '+' : ''}${formatPercent(value, 2)}`;
}

function getPoolApy(pool: PoolDetailRaw): number {
  const fromApy = normalizeApy(pool.poolAPY);
  if (fromApy > 0) return fromApy;

  const fromApr = normalizeApy(pool.annualPercentageRate);
  if (fromApr > 0) return fromApr;

  return 0;
}

function calculateDepthRuneEquivalent(pool: PoolDetailRaw, runePrice: number): number {
  const runeDepth = runeToNumber(pool.runeDepth);
  const assetDepth = runeToNumber(pool.assetDepth);
  const assetPriceUsd = Number(pool.assetPriceUSD);

  if (!Number.isFinite(assetPriceUsd) || assetPriceUsd <= 0 || runePrice <= 0) {
    return runeDepth;
  }

  return runeDepth + (assetDepth * assetPriceUsd) / runePrice;
}
