import type { BondPosition } from '@/lib/types/node';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertTriangle, Shield, Server, Info, ArrowRight, PlusCircle, MinusCircle } from 'lucide-react';
import { calculatePortfolioHealth, getGradeColor } from '@/lib/utils/health-score';
import { useState } from 'react';
import Link from 'next/link';

interface NodeStatusCardProps {
  position: BondPosition;
  currentBlockHeight?: number;
  address?: string | null;
}

export function NodeStatusCard({ position, currentBlockHeight, address }: NodeStatusCardProps) {
  const health = calculatePortfolioHealth([position]);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3 relative group hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
          {position.nodeAddress.slice(0, 16)}...{position.nodeAddress.slice(-6)}
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="relative cursor-help"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 ${getGradeColor(health.grade)}`}>
              {health.grade}
            </span>
            {isHovered && (
              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded shadow-xl z-50 border border-zinc-800">
                <div className="flex items-center gap-1 mb-1 text-zinc-400 font-bold uppercase tracking-tighter">
                  <Info className="w-3 h-3" />
                  Node Health
                </div>
                <p className="leading-relaxed text-zinc-300">{health.reason}</p>
                <div className="absolute -bottom-1 right-1/2 translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45" />
              </div>
            )}
          </div>
          <StatusBadge status={position.status} isJailed={position.isJailed} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-zinc-500">Total Bond</div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            {position.totalBond.toLocaleString(undefined, { maximumFractionDigits: 0 })} RUNE
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Operator Fee</div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{position.operatorFeeFormatted}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Slash Points</div>
          <div className={cn('font-medium', position.slashPoints > 100 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100')}>
            {position.slashPoints.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Version</div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">v{position.version}</div>
        </div>
      </div>

      {/* Quick Actions - only visible on hover to keep UI clean */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link 
          href={`/dashboard/transactions?address=${address}&node=${position.nodeAddress}&action=bond&amount=10000`}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold uppercase hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        >
          <PlusCircle className="w-3 h-3" />
          Bond 10k
        </Link>
        <Link 
          href={`/dashboard/transactions?address=${address}&node=${position.nodeAddress}&action=unbond`}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-[10px] font-bold uppercase hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          <MinusCircle className="w-3 h-3" />
          Unbond
        </Link>
      </div>

      {position.isJailed && position.jailReason && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Jailed: {position.jailReason}</span>
        </div>
      )}

      {position.requestedToLeave && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>Node requested to leave</span>
        </div>
      )}

      {position.slashPoints > 100 && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-600 dark:text-orange-400">
          <Server className="w-3.5 h-3.5 shrink-0" />
          <span>High slash points ({position.slashPoints.toLocaleString()})</span>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
