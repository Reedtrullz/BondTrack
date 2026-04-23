'use client';

import { useCurrentBlockHeight } from '@/lib/hooks/use-current-block-height';
import { calculateJailBlocksRemaining, estimateNextChurn } from '@/lib/utils/calculations';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { BondPosition } from '@/lib/types/node';

interface SlashMonitorProps {
  positions: BondPosition[];
}

function getSlashSeverity(slashPoints: number): { level: 'ok' | 'warning' | 'critical'; label: string; color: string } {
  if (slashPoints >= 200) return { level: 'critical', label: 'Critical', color: 'text-red-600 dark:text-red-400' };
  if (slashPoints >= 50) return { level: 'warning', label: 'Warning', color: 'text-orange-600 dark:text-orange-400' };
  return { level: 'ok', label: 'OK', color: 'text-emerald-600 dark:text-emerald-400' };
}

function formatTimeRemaining(blocks: number): string {
  const totalSeconds = blocks * 6;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SlashMonitor({ positions }: SlashMonitorProps) {
  const { currentBlockHeight: liveBlockHeight } = useCurrentBlockHeight();
  const currentBlockHeight = liveBlockHeight || 0;

  const slashNodes = positions
    .filter(position => position.slashPoints > 0)
    .map(position => ({
      nodeAddress: position.nodeAddress,
      status: position.status,
      slashPoints: position.slashPoints,
      isJailed: position.isJailed,
      jailReleaseHeight: position.jailReleaseHeight,
      jailReason: position.jailReason || '',
    }))
    .sort((a, b) => b.slashPoints - a.slashPoints);

  const criticalNodes = slashNodes.filter(n => n.slashPoints >= 200);
  const warningNodes = slashNodes.filter(n => n.slashPoints >= 50 && n.slashPoints < 200);
  const jailedNodes = slashNodes.filter(n => n.isJailed);
  const nextChurn = estimateNextChurn(currentBlockHeight);

  const hasSlashPoints = slashNodes.length > 0;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Slash Point Monitor</h3>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span>Next churn: {formatTimeRemaining(nextChurn.blocksRemaining)}</span>
        </div>
      </div>

      {!hasSlashPoints ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">No slash points on your nodes</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-[200px] mt-1">
            Slash points are accumulated by nodes that fail to remain performant. Your nodes currently have a clean record.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{criticalNodes.length}</div>
              <div className="text-xs text-red-600 dark:text-red-400">Critical</div>
            </div>
            <div className="p-2 rounded bg-orange-50 dark:bg-orange-900/20 text-center">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{warningNodes.length}</div>
              <div className="text-xs text-orange-600 dark:text-orange-400">Warning</div>
            </div>
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{jailedNodes.length}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Jailed</div>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {slashNodes.map((node) => {
              const severity = getSlashSeverity(node.slashPoints);
              const jailBlocksRemaining = node.isJailed 
                ? calculateJailBlocksRemaining(node.jailReleaseHeight, currentBlockHeight)
                : 0;

              return (
                <div key={node.nodeAddress} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 text-sm gap-1 sm:gap-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {node.nodeAddress.slice(0, 12)}...{node.nodeAddress.slice(-6)}
                    </span>
                    <StatusBadge status={node.status} isJailed={node.isJailed} />
                  </div>
                  <div className="flex items-center gap-3 sm:gap-3 ml-0 sm:ml-auto">
                    {node.isJailed && jailBlocksRemaining > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{formatTimeRemaining(jailBlocksRemaining)}</span>
                      </div>
                    )}
                    <span className={`font-medium ${severity.color}`}>
                      {node.slashPoints.toLocaleString()}
                    </span>
                    <span className={`text-xs ${severity.color}`}>{severity.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Severity: OK (0-49), Warning (50-199), Critical (200+)
          </div>
        </>
      )}
    </div>
  );
}
