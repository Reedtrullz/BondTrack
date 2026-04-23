import { cn } from '@/lib/utils';
import { Badge } from './badge';

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Standby: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Ready: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Disabled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Whitelisted: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

interface StatusBadgeProps {
  status: string;
  isJailed?: boolean;
  className?: string;
}

export function StatusBadge({ status, isJailed, className }: StatusBadgeProps) {
  const colorClass = isJailed
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-700'
    : statusColors[status] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';

  const getIndicator = () => {
    if (isJailed) {
      return <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />;
    }
    if (status === 'Active') {
      return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />;
    }
    if (status === 'Standby') {
      return <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />;
    }
    return <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />;
  };

  return (
    <Badge className={cn('flex items-center gap-1.5', colorClass, className)}>
      {getIndicator()}
      <span>{isJailed ? 'Jailed' : status}</span>
    </Badge>
  );
}
