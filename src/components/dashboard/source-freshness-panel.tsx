'use client';

import { AlertCircle, CheckCircle2, Clock3, HelpCircle, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatFreshnessAge, type SourceFreshness, type SourceStatus } from '@/lib/dashboard/insights';

interface SourceFreshnessPanelProps {
  sources: SourceFreshness[];
  now?: Date;
  title?: string;
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
}: SourceFreshnessPanelProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80" aria-label={title}>
      <div className="mb-4 flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Confidence for the live readings on this screen.
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
