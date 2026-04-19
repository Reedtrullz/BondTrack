'use client';

export function PoolStatusBadge({ status }: { status: 'available' | 'staged' | 'suspended' | 'unknown' }) {
  if (!status) return null;

  const statusConfig = {
    available: {
      bgClass: 'bg-green-500',
      textClass: 'text-white dark:text-white',
      label: 'Available',
    },
    staged: {
      bgClass: 'bg-yellow-500',
      textClass: 'text-zinc-900 dark:text-white',
      label: 'Staged',
    },
    suspended: {
      bgClass: 'bg-red-500',
      textClass: 'text-white dark:text-white',
      label: 'Suspended',
    },
    unknown: {
      bgClass: 'bg-zinc-500',
      textClass: 'text-white dark:text-white',
      label: 'Unknown',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`rounded px-2 py-1 text-sm font-medium ${config.bgClass} ${config.textClass}`}>
      {config.label}
    </span>
  );
}
