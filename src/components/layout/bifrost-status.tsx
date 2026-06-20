'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApiHealthContext, type ApiHealthStatus } from '@/lib/hooks/use-api-health';

function getBridgeStatus(midgard: ApiHealthStatus, thornode: ApiHealthStatus): ApiHealthStatus {
  if (midgard === 'mock' || thornode === 'mock') return 'mock';
  if (midgard === 'down' || thornode === 'down') return 'down';
  if (midgard === 'degraded' || thornode === 'degraded') return 'degraded';
  if (midgard === 'unknown' || thornode === 'unknown') return 'unknown';
  return 'healthy';
}

function getStatusCopy(status: ApiHealthStatus): { label: string; detail: string } {
  switch (status) {
    case 'healthy':
      return { label: 'Sources responding', detail: 'Recent Midgard + THORNode checks responded' };
    case 'degraded':
      return { label: 'Source checks degraded', detail: 'One recent check is retrying' };
    case 'down':
      return { label: 'Source checks failing', detail: 'Current data may be unavailable' };
    case 'mock':
      return { label: 'Demo data', detail: 'Local mock fixtures are not live source checks' };
    case 'unknown':
    default:
      return { label: 'Source checks pending', detail: 'Waiting for health probes' };
  }
}

export function BifrostStatus() {
  const { midgard, thornode } = useApiHealthContext();
  const status = getBridgeStatus(midgard, thornode);
  const copy = getStatusCopy(status);

  return (
    <div className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm transition-all hover:bg-zinc-900/10 dark:hover:bg-white/10">
      <div className="relative" aria-hidden="true">
        <div className={cn(
          'w-2 h-2 rounded-full transition-all duration-1000',
          status === 'healthy' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.45)]' :
          status === 'mock' ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]' :
          status === 'degraded' || status === 'unknown' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
          'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
        )} />
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{copy.label}</span>
        <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 italic">{copy.detail}</span>
      </div>

      <Zap className={cn(
        'ml-auto w-3 h-3 transition-colors',
        status === 'healthy' ? 'text-cyan-500/60 group-hover:text-cyan-500' : status === 'mock' ? 'text-sky-500/70' : 'text-zinc-500'
      )} aria-hidden="true" />
    </div>
  );
}
