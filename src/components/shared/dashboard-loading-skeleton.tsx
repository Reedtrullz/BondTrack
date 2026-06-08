export function DashboardLoadingSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-6 motion-safe:animate-pulse">
      <div className="h-12 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-32 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
