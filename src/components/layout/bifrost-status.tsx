'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApiHealth, type ApiHealthStatus } from '@/lib/hooks/use-api-health';

function getBridgeStatus(midgard: ApiHealthStatus, thornode: ApiHealthStatus): ApiHealthStatus {
  if (midgard === 'down' || thornode === 'down') return 'down';
  if (midgard === 'unknown' || thornode === 'unknown') return 'unknown';
  if (midgard === 'degraded' || thornode === 'degraded') return 'degraded';
  return 'healthy';
}

function getStatusCopy(status: ApiHealthStatus): { label: string; detail: string } {
  switch (status) {
    case 'healthy':
      return { label: 'Sources healthy', detail: 'Midgard + THORNode confirmed' };
    case 'degraded':
      return { label: 'Sources degraded', detail: 'One source is retrying' };
    case 'down':
      return { label: 'Sources down', detail: 'Data may be unavailable' };
    case 'unknown':
    default:
      return { label: 'Sources unknown', detail: 'Health check pending' };
  }
}

export function BifrostStatus() {
  const { midgard, thornode } = useApiHealth();
  const status = getBridgeStatus(midgard, thornode);
  const copy = getStatusCopy(status);

  return (
    <div className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm transition-all hover:bg-zinc-900/10 dark:hover:bg-white/10">
      <div className="relative" aria-hidden="true">
        <div className={cn(
          'w-2 h-2 rounded-full transition-all duration-1000',
          status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
          status === 'degraded' || status === 'unknown' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
          'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
        )} />
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-500 dark:text-zinc-400">{copy.label}</span>
        <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 italic">{copy.detail}</span>
      </div>

      <Zap className={cn(
        'ml-auto w-3 h-3 transition-colors',
        status === 'healthy' ? 'text-amber-500/50 group-hover:text-amber-500' : 'text-zinc-500'
      )} aria-hidden="true" />
    </div>
  );
}
