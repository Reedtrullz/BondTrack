'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InsightHeaderMetric, InsightSeverity } from '@/lib/dashboard/insights';

interface InsightHeaderProps {
  severity: InsightSeverity;
  statusLabel: string;
  diagnosis: string;
  topRisk: string;
  headingLevel?: 1 | 2;
  metrics: InsightHeaderMetric[];
  primaryAction: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  eyebrow?: string;
  compactMobileMetrics?: boolean;
}

const severityConfig: Record<InsightSeverity, {
  icon: ReactNode;
  label: string;
  container: string;
  badge: string;
  accent: string;
}> = {
  healthy: {
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
    label: 'Healthy',
    container: 'border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    accent: 'text-emerald-600 dark:text-emerald-300',
  },
  info: {
    icon: <Info className="h-5 w-5" aria-hidden="true" />,
    label: 'Info',
    container: 'border-sky-200/70 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
    accent: 'text-sky-600 dark:text-sky-300',
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
    label: 'Needs Attention',
    container: 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
    accent: 'text-amber-600 dark:text-amber-300',
  },
  critical: {
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    label: 'At Risk',
    container: 'border-red-200/80 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20',
    badge: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200',
    accent: 'text-red-600 dark:text-red-300',
  },
};

export function InsightHeader({
  severity,
  statusLabel,
  diagnosis,
  topRisk,
  headingLevel = 1,
  metrics,
  primaryAction,
  eyebrow = 'Command center',
  compactMobileMetrics = false,
}: InsightHeaderProps) {
  const config = severityConfig[severity];
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const actionVariant = severity === 'critical'
    ? 'destructive'
    : severity === 'warning'
      ? 'primary'
      : severity === 'info'
        ? 'outline'
        : 'success';

  return (
    <section
      className={cn(
        'rounded-2xl border shadow-sm sm:p-6',
        compactMobileMetrics ? 'p-4' : 'p-5',
        config.container
      )}
      aria-label={`${eyebrow} diagnosis`}
    >
      <div className={cn('flex flex-col lg:flex-row lg:items-start lg:justify-between', compactMobileMetrics ? 'gap-4 sm:gap-5' : 'gap-5')}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase', config.badge)}>
              {config.icon}
              {statusLabel || config.label}
            </span>
            <span className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              {eyebrow}
            </span>
          </div>
          <Heading className={cn('font-bold leading-tight text-zinc-950 dark:text-zinc-50 sm:mt-4 sm:text-3xl', compactMobileMetrics ? 'mt-3 text-xl' : 'mt-4 text-2xl')}>
            {topRisk}
          </Heading>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {diagnosis}
          </p>
        </div>

        {primaryAction.onClick ? (
          <div className="shrink-0">
            <Button type="button" variant={actionVariant} className="w-full gap-2 sm:w-auto" onClick={primaryAction.onClick}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {primaryAction.label}
            </Button>
          </div>
        ) : (
          <Link
            href={primaryAction.href}
            className={cn('shrink-0 w-full gap-2 sm:w-auto', buttonVariants({ variant: actionVariant }))}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {primaryAction.label}
          </Link>
        )}
      </div>

      <div className={cn('mt-5 grid sm:grid-cols-3', compactMobileMetrics ? 'grid-cols-3 gap-2 sm:gap-3' : 'grid-cols-1 gap-3')}>
        {metrics.map((metric) => (
          <div
            key={`${metric.label}:${metric.value}`}
            className={cn(
              'rounded-xl border border-white/70 bg-white/60 dark:border-zinc-800/70 dark:bg-zinc-950/30',
              compactMobileMetrics ? 'min-w-0 p-2 sm:p-3' : 'p-3'
            )}
          >
            <div className={cn('font-semibold uppercase text-zinc-500 dark:text-zinc-400', compactMobileMetrics ? 'text-[10px] leading-3 sm:text-xs sm:leading-4' : 'text-xs')}>{metric.label}</div>
            <div className={cn('mt-1 break-words font-mono font-bold leading-tight text-zinc-950 dark:text-zinc-50 sm:text-lg', compactMobileMetrics ? 'text-sm' : 'text-lg', metric.label === 'Health score' ? config.accent : null)}>
              {metric.value}
            </div>
            {metric.detail ? (
              <div className={cn('mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400', compactMobileMetrics ? 'hidden sm:block' : null)}>{metric.detail}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
