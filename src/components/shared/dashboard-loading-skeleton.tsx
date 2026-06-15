import { cn } from '@/lib/utils';

interface DashboardLoadingSkeletonProps {
  title?: string;
  detail?: string;
  cards?: number;
  className?: string;
}

export function DashboardLoadingSkeleton({
  title = 'Loading dashboard source data',
  detail = 'Waiting for THORNode, Midgard, and price source responses before showing operator decisions.',
  cards = 3,
  className,
}: DashboardLoadingSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
      className={cn('flex w-full flex-col gap-4 p-4 md:p-6', className)}
      role="status"
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">{detail}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3 motion-safe:animate-pulse" aria-hidden="true">
          <div className="h-4 w-full max-w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-full max-w-2xl rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-xl bg-zinc-200/60 motion-safe:animate-pulse dark:bg-zinc-800/70"
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="h-64 rounded-xl bg-zinc-200/60 motion-safe:animate-pulse dark:bg-zinc-800/70"
      />
    </section>
  );
}
