'use client';

import { Shield, AlertTriangle, Minus } from 'lucide-react';
import { NETWORK } from '@/lib/config';
import { cn } from '@/lib/utils';

type NetworkSecurityHealth = 'healthy' | 'warning' | 'at-risk';

type NetworkSecurityCardProps = {
  ratio: number;
  activeRatio?: number;
  health: NetworkSecurityHealth;
  status: string;
};

function getHealthStyles(health: NetworkSecurityHealth) {
  switch (health) {
    case 'healthy':
      return {
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
        ratio: 'text-emerald-600 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        icon: <Shield className="h-4 w-4" />,
      };
    case 'warning':
      return {
        badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
        ratio: 'text-amber-600 dark:text-amber-400',
        bar: 'bg-amber-500',
        icon: <Minus className="h-4 w-4" />,
      };
    case 'at-risk':
    default:
      return {
        badge: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
        ratio: 'text-red-600 dark:text-red-400',
        bar: 'bg-red-500',
        icon: <AlertTriangle className="h-4 w-4" />,
      };
  }
}

export function NetworkSecurityCard({ ratio, activeRatio, health, status }: NetworkSecurityCardProps) {
  const styles = getHealthStyles(health);
  const progress = ratio > 0 ? Math.min(ratio * NETWORK.PROGRESS_BAR_MULTIPLIER, 100) : 0;

  return (
    <section
      aria-label="Network security bond-to-pool gauge"
      className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
            Network Security
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Bond-to-Pool Gauge
          </h3>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', styles.badge)}>
          {styles.icon}
          {health}
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div aria-label="Bond-to-pool ratio" className={cn('text-4xl font-semibold', styles.ratio)}>
            {ratio > 0 ? `${ratio.toFixed(2)}x` : '--'}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {status}
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
          <div className="font-medium text-zinc-700 dark:text-zinc-300">Midgard reading</div>
          <div>freshness shown in source status</div>
          {typeof activeRatio === 'number' && activeRatio > 0 && (
            <div className="mt-1">
              <div className="font-medium text-zinc-700 dark:text-zinc-300">{activeRatio.toFixed(2)}x</div>
              <div>active bond coverage</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Security coverage</span>
          <span>{ratio > 0 ? `${ratio.toFixed(2)}x` : '--'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={cn('h-full rounded-full transition-all', styles.bar)} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  );
}
