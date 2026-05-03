import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type DashboardCardHighlight = 'emerald' | 'amber' | 'red' | 'cyan';

interface DashboardCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  highlight?: DashboardCardHighlight;
}

const highlightClasses: Record<DashboardCardHighlight, string> = {
  emerald: 'border-emerald-200/60 dark:border-emerald-800/40',
  amber: 'border-amber-200/60 dark:border-amber-800/40',
  red: 'border-red-200/60 dark:border-red-800/40',
  cyan: 'border-cyan-200/60 dark:border-cyan-800/40',
};

export function DashboardCard({ children, className, title, icon, highlight, ...props }: DashboardCardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80',
        highlight ? highlightClasses[highlight] : null,
        className
      )}
    >
      {title ? (
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {icon}
          <span>{title}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
