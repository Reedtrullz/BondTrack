'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisclosureSectionProps {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function DisclosureSection({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
}: DisclosureSectionProps) {
  return (
    <details
      className={cn(
        'group rounded-2xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80',
        className
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 marker:hidden">
        <span>
          <span className="block text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</span>
          {summary ? <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">{summary}</span> : null}
        </span>
        <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
        {children}
      </div>
    </details>
  );
}
