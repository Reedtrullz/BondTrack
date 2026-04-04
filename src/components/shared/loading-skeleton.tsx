export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-4 w-72 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}
