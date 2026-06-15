'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InsightSeverity, MetricStripItem } from '@/lib/dashboard/insights';

interface MetricStripProps {
  id?: string;
  metrics: MetricStripItem[];
  title?: string;
}

const severityClass: Record<InsightSeverity, string> = {
  healthy: 'text-emerald-600 dark:text-emerald-400',
  info: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
};

function SeverityIcon({ severity }: { severity?: InsightSeverity }) {
  if (severity === 'critical' || severity === 'warning') {
    return <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (severity === 'healthy') {
    return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (severity === 'info') {
    return <Info className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return null;
}

export function MetricStrip({ id, metrics, title = 'Supporting metrics' }: MetricStripProps) {
  return (
    <section id={id} className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80" aria-label={title}>
      <div className="mb-3 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">{title}</div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="min-h-20 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 text-xs font-semibold leading-4 text-zinc-500 dark:text-zinc-400">{metric.label}</span>
              <span className={cn('shrink-0', metric.severity ? severityClass[metric.severity] : 'text-zinc-400')}>
                <SeverityIcon severity={metric.severity} />
              </span>
            </div>
            <div className={cn('mt-2 break-words font-mono text-base font-bold leading-tight text-zinc-950 dark:text-zinc-50', metric.severity ? severityClass[metric.severity] : null)}>
              {metric.value}
            </div>
            {metric.detail ? (
              <div className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-400">{metric.detail}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
