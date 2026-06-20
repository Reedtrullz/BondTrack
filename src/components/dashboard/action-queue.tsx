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
  emptyTone?: 'good' | 'info';
  compact?: boolean;
  mobileCompact?: boolean;
}

const severityConfig: Record<InsightSeverity, {
  label: string;
  icon: ReactNode;
  row: string;
  badge: string;
}> = {
  critical: {
    label: 'Action needed',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    row: 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/10',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  },
  warning: {
    label: 'Review',
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
    label: 'No urgent review',
    icon: <Info className="h-4 w-4" aria-hidden="true" />,
    row: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
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
  title = 'Provider review queue',
  emptyTitle = 'No urgent provider review visible',
  emptyDetail = 'Current source responses do not show a node, source, or LP issue that needs provider review.',
  emptyTone = 'info',
  compact = false,
  mobileCompact = false,
}: ActionQueueProps) {
  const EmptyIcon = emptyTone === 'info' ? Info : CheckCircle2;
  const emptyToneClass = emptyTone === 'info'
    ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200';
  const emptyDetailClass = emptyTone === 'info'
    ? 'text-sky-700 dark:text-sky-300'
    : 'text-emerald-700 dark:text-emerald-300';

  return (
    <section
      className={cn(
        'rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80',
        mobileCompact ? 'p-2.5 sm:p-5' : 'p-5'
      )}
      aria-label={title}
    >
      <div className={cn('flex items-start justify-between gap-3', mobileCompact ? 'mb-1.5 sm:mb-4' : 'mb-4')}>
        <div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
          <p className={cn('text-sm text-zinc-500 dark:text-zinc-400', mobileCompact ? 'sr-only sm:not-sr-only' : '')}>
            Ranked by provider exposure, not by visual noise.
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {items.length} open
        </span>
      </div>

      {items.length === 0 ? (
        <div className={cn('rounded-xl border p-4', emptyToneClass)}>
          <div className="flex items-center gap-2 font-semibold">
            <EmptyIcon className="h-4 w-4" aria-hidden="true" />
            {emptyTitle}
          </div>
          <p className={cn('mt-1 text-sm', emptyDetailClass)}>{emptyDetail}</p>
        </div>
      ) : (
        <div className={cn(mobileCompact ? 'space-y-3 sm:space-y-4' : 'space-y-4')}>
          {groupItems(items).map(([severity, entries]) => {
            const config = severityConfig[severity];
            return (
              <div key={severity} className={cn(mobileCompact ? 'space-y-1.5 sm:space-y-2' : 'space-y-2')}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                  {config.icon}
                  {config.label}
                </div>
                {entries.map((item) => {
                  const actionLabel = item.primaryAction ?? 'Inspect';

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        'rounded-xl border',
                        mobileCompact ? 'p-1.5 sm:p-3' : 'p-3',
                        compact ? 'space-y-2' : mobileCompact ? 'space-y-2 sm:space-y-3' : 'space-y-3',
                        config.row
                      )}
                    >
                      <div
                        className={cn(
                          mobileCompact
                            ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3'
                            : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
                        )}
                      >
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
                          <h3
                            className={cn(
                              'font-bold text-zinc-950 dark:text-zinc-50',
                              mobileCompact
                                ? 'mt-1 whitespace-normal break-words text-[13px] leading-[18px] sm:mt-2 sm:leading-5 sm:text-sm'
                                : 'mt-2 text-sm'
                            )}
                          >
                            {item.title}
                          </h3>
                          <p
                            className={cn(
                              'mt-1 text-zinc-700 dark:text-zinc-300',
                              mobileCompact ? 'line-clamp-2 text-xs leading-4 sm:line-clamp-none sm:text-sm sm:leading-5' : 'text-sm leading-5'
                            )}
                          >
                            {item.detail}
                          </p>
                          {!compact ? (
                            <p
                              className={cn(
                                'font-medium text-zinc-500 dark:text-zinc-400',
                                mobileCompact
                                  ? 'mt-1 line-clamp-1 text-[11px] leading-[14px] sm:mt-2 sm:line-clamp-none sm:text-xs sm:leading-4'
                                  : 'mt-2 text-xs'
                              )}
                            >
                              Provider impact: {item.impact}
                            </p>
                          ) : null}
                        </div>
                        <Link
                          href={item.href}
                          className={cn(
                            'inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white font-bold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
                            mobileCompact ? 'h-8 px-2 text-[11px] sm:h-9 sm:px-3 sm:text-xs' : 'h-9 px-3 text-xs'
                          )}
                        >
                          {actionLabel}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
