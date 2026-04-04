import type { BondPosition } from '@/lib/types/node';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertTriangle, Shield, Server } from 'lucide-react';

interface NodeStatusCardProps {
  position: BondPosition;
  currentBlockHeight?: number;
}

export function NodeStatusCard({ position, currentBlockHeight }: NodeStatusCardProps) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
          {position.nodeAddress.slice(0, 16)}...{position.nodeAddress.slice(-6)}
        </div>
        <StatusBadge status={position.status} isJailed={position.isJailed} />
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
