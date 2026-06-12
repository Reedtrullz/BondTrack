'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFreshnessAge, type ActionItem, type InsightSeverity } from '@/lib/dashboard/insights';

interface ActionQueueProps {
  items: ActionItem[];
  now?: Date;
  title?: string;
  emptyTitle?: string;
  emptyDetail?: string;
  compact?: boolean;
}

const severityConfig: Record<InsightSeverity, {
  label: string;
  icon: ReactNode;
  row: string;
  badge: string;
}> = {
  critical: {
    label: 'Critical',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    row: 'border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  },
  warning: {
    label: 'Warning',
    icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
    row: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  },
  info: {
    label: 'Info',
    icon: <Info className="h-4 w-4" aria-hidden="true" />,
    row: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  },
  healthy: {
    label: 'Healthy',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    row: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
};

function groupItems(items: ActionItem[]): Array<[InsightSeverity, ActionItem[]]> {
  const order: InsightSeverity[] = ['critical', 'warning', 'info', 'healthy'];
  return order
    .map((severity) => [severity, items.filter((item) => item.severity === severity)] as [InsightSeverity, ActionItem[]])
    .filter(([, entries]) => entries.length > 0);
}

export function ActionQueue({
  items,
  now = new Date(),
  title = 'Critical actions',
  emptyTitle = 'No urgent action',
  emptyDetail = 'Live data does not show a critical node, source, or LP confidence issue.',
  compact = false,
}: ActionQueueProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80" aria-label={title}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ranked by operator impact, not by visual noise.
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {items.length} open
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {emptyTitle}
          </div>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">{emptyDetail}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupItems(items).map(([severity, entries]) => {
            const config = severityConfig[severity];
            return (
              <div key={severity} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                  {config.icon}
                  {config.label}
                </div>
                {entries.map((item) => (
                  <article
                    key={item.id}
                    className={cn('rounded-xl border p-3', compact ? 'space-y-2' : 'space-y-3', config.row)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', config.badge)}>
                            {config.icon}
                            {item.source}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <Clock3 className="h-3 w-3" aria-hidden="true" />
                            {formatFreshnessAge(new Date(item.lastSeen), now)}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-zinc-950 dark:text-zinc-50">{item.title}</h3>
                        <p className="mt-1 text-sm leading-5 text-zinc-700 dark:text-zinc-300">{item.detail}</p>
                        {!compact ? (
                          <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Impact: {item.impact}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={item.href}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {item.primaryAction ?? 'Inspect'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
