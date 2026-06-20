'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InsightSeverity, MetricStripItem } from '@/lib/dashboard/insights';

interface MetricStripProps {
  compactDetailMode?: 'actionable' | 'all';
  id?: string;
  compactMobileColumns?: 2 | 3 | 4;
  mobileDensity?: 'regular' | 'compact';
  metrics: MetricStripItem[];
  title?: string;
}

const compactMobileGridClass: Record<NonNullable<MetricStripProps['compactMobileColumns']>, string> = {
  2: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-7',
  3: 'grid-cols-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7',
  4: 'grid-cols-4 md:grid-cols-4 xl:grid-cols-7',
};

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

export function MetricStrip({
  compactDetailMode = 'actionable',
  compactMobileColumns = 3,
  id,
  mobileDensity = 'regular',
  metrics,
  title = 'Supporting metrics',
}: MetricStripProps) {
  const isCompactMobile = mobileDensity === 'compact';
  const isFourColumnMobile = isCompactMobile && compactMobileColumns === 4;

  return (
    <section
      id={id}
      className={cn(
        'rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80',
        isFourColumnMobile ? 'p-1 sm:p-4' : null,
        isCompactMobile && !isFourColumnMobile ? 'p-2 sm:p-4' : null,
        !isCompactMobile ? 'p-4' : null
      )}
      aria-label={title}
    >
      <div className={cn(
        'text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400',
        isFourColumnMobile ? 'mb-1 text-[10px] leading-3 sm:mb-3 sm:text-xs sm:leading-4' : null,
        isCompactMobile && !isFourColumnMobile ? 'mb-1.5 sm:mb-3' : null,
        !isCompactMobile ? 'mb-3' : null
      )}
      >
        {title}
      </div>
      <div className={cn(
        'grid',
        isCompactMobile ? compactMobileGridClass[compactMobileColumns] : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-7',
        isCompactMobile ? 'gap-1.5 sm:gap-2' : 'gap-2'
      )}
      >
        {metrics.map((metric) => {
          const isActionableDetail = metric.severity === 'warning' || metric.severity === 'critical';
          const showDetailOnCompactPhone = isFourColumnMobile && (
            isActionableDetail || compactDetailMode === 'all'
          );

          return (
            <div
              key={metric.id}
              className={cn(
                'rounded-xl border border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/30',
                isFourColumnMobile ? 'min-h-0 p-0.5 sm:min-h-20 sm:p-3' : null,
                showDetailOnCompactPhone ? 'col-span-2 p-1.5 sm:col-span-1 sm:p-3' : null,
                isCompactMobile && !isFourColumnMobile ? 'min-h-0 p-1.5 sm:min-h-20 sm:p-3' : null,
                !isCompactMobile ? 'min-h-20 p-3' : null
              )}
            >
              <div className={cn(
                'flex justify-between',
                isFourColumnMobile ? 'items-start gap-1 sm:items-center sm:gap-2' : 'items-center gap-2'
              )}
              >
                <span className={cn(
                  'min-w-0 break-words font-semibold text-zinc-500 dark:text-zinc-400',
                  isFourColumnMobile ? 'text-[10px] leading-[11px] sm:text-xs sm:leading-4' : null,
                  isCompactMobile && !isFourColumnMobile ? 'text-[11px] leading-3 sm:text-xs sm:leading-4' : null,
                  !isCompactMobile ? 'text-xs leading-4' : null
                )}
                >
                  {metric.label}
                </span>
                <span className={cn('shrink-0', metric.severity ? severityClass[metric.severity] : 'text-zinc-400')}>
                  <SeverityIcon severity={metric.severity} />
                </span>
              </div>
              <div className={cn(
                'break-words font-mono font-bold leading-tight text-zinc-950 dark:text-zinc-50',
                isFourColumnMobile ? 'mt-0.5 text-[12px] sm:mt-2 sm:text-base' : null,
                isCompactMobile && !isFourColumnMobile ? 'mt-0.5 text-[13px] sm:mt-2 sm:text-base' : null,
                !isCompactMobile ? 'mt-2 text-base' : null,
                metric.severity ? severityClass[metric.severity] : null
              )}
              >
                {metric.value}
              </div>
              {metric.detail ? (
                <div className={cn(
                  'mt-1 text-xs text-zinc-500 dark:text-zinc-400',
                  isFourColumnMobile
                    ? showDetailOnCompactPhone
                      ? 'block text-[10px] leading-3 sm:line-clamp-none sm:text-xs sm:leading-4'
                      : 'hidden sm:block sm:line-clamp-none sm:text-xs sm:leading-4'
                    : null,
                  isCompactMobile && !isFourColumnMobile
                    ? isActionableDetail || compactDetailMode === 'all'
                      ? 'text-[10px] leading-3 sm:text-xs sm:leading-4'
                      : 'line-clamp-1 text-[10px] leading-3 sm:line-clamp-none sm:text-xs sm:leading-4'
                    : null,
                  !isCompactMobile ? 'leading-4' : null
                )}
                >
                  {metric.detail}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
