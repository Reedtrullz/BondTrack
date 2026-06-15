'use client';

import { AlertCircle, CheckCircle2, Clock3, HelpCircle, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatFreshnessAge, type SourceFreshness, type SourceStatus } from '@/lib/dashboard/insights';

interface SourceFreshnessPanelProps {
  sources: SourceFreshness[];
  now?: Date;
  title?: string;
  compact?: boolean;
}

const statusConfig: Record<SourceStatus, {
  label: string;
  icon: ReactNode;
  className: string;
}> = {
  fresh: {
    label: 'Fresh',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200',
  },
  stale: {
    label: 'Stale',
    icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
    className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200',
  },
  degraded: {
    label: 'Degraded',
    icon: <WifiOff className="h-4 w-4" aria-hidden="true" />,
    className: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200',
  },
  unknown: {
    label: 'Unknown',
    icon: <HelpCircle className="h-4 w-4" aria-hidden="true" />,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300',
  },
};

export function SourceFreshnessPanel({
  sources,
  now = new Date(),
  title = 'Source freshness',
  compact = false,
}: SourceFreshnessPanelProps) {
  if (compact) {
    const degradedCount = sources.filter((source) => source.status === 'degraded' || source.status === 'stale').length;
    const unknownCount = sources.filter((source) => source.status === 'unknown').length;
    const summaryLabel = degradedCount > 0
      ? `${degradedCount} degraded`
      : unknownCount > 0
        ? `${unknownCount} unknown`
        : 'All fresh';

    return (
      <section
        className="rounded-2xl border border-zinc-200 bg-white/90 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
        aria-label="Source confidence"
        data-variant="compact"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Data source confidence</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-bold text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            {summaryLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {sources.map((source) => {
            const config = statusConfig[source.status];
            return (
              <div
                key={source.source}
                className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/30"
              >
                <div className="truncate text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {source.source}
                </div>
                <span className={cn('mt-1 inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold', config.className)}>
                  <span className="shrink-0">{config.icon}</span>
                  <span className="truncate">{config.label}</span>
                </span>
                <div className="mt-1 truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                  {formatFreshnessAge(source.lastSuccess, now)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80" aria-label={title}>
      <div className="mb-4 flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Confidence for the readings on this screen.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sources.map((source) => {
          const config = statusConfig[source.status];
          return (
            <div
              key={source.source}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{source.source}</div>
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold', config.className)}>
                  {config.icon}
                  {config.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Last success: {formatFreshnessAge(source.lastSuccess, now)}</span>
                {typeof source.latencyMs === 'number' ? <span>{source.latencyMs}ms</span> : null}
              </div>
              {source.detail ? (
                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{source.detail}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
