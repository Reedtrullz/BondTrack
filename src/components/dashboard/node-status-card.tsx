import type { BondPosition } from '@/lib/types/node';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertTriangle, Shield, Server, Info, PlusCircle, MinusCircle } from 'lucide-react';
import { calculatePortfolioHealth, getGradeColor } from '@/lib/utils/health-score';
import { useId, useState } from 'react';
import Link from 'next/link';
import { formatBasisPoints, formatRuneDisplayNumber } from '@/lib/utils/formatters';
import { getCandidateBondSourceSafety, type CandidateBondSourceSafety } from '@/lib/dashboard/candidate-bond-source-safety';
import { isUrgentNodeException } from '@/lib/dashboard/nodes-context';
import { canUnbondNode } from '@/lib/transactions/bond';
import { buildBondMemoHref, buildNodeRiskHref } from '@/lib/dashboard/hrefs';
import { formatDashboardNumber, isUsableDashboardMetric } from '@/lib/dashboard/metrics';
import { getSlashSeverity, hasSlashReviewSignal } from '@/lib/dashboard/slash-severity';
import { cn } from '@/lib/utils';

interface NodeStatusCardProps {
  position: BondPosition;
  address?: string | null;
  sourceSafety?: CandidateBondSourceSafety;
}

const DEFAULT_SOURCE_SAFETY = getCandidateBondSourceSafety('unknown');

export function NodeStatusCard({ position, address, sourceSafety = DEFAULT_SOURCE_SAFETY }: NodeStatusCardProps) {
  const health = calculatePortfolioHealth([position]);
  const scoreTooltipId = useId();
  const [isScoreTooltipOpen, setIsScoreTooltipOpen] = useState(false);
  const slashSeverity = getSlashSeverity(position.slashPoints);
  const hasElevatedSlash = hasSlashReviewSignal(position.slashPoints);
  const requiresBondReview = isUrgentNodeException(position);
  const unbondEligibility = canUnbondNode(position);
  const canPrepareUnbond = sourceSafety.canPrepareBond && unbondEligibility.canUnbond;
  const unbondUnavailableReason = sourceSafety.canPrepareBond && !unbondEligibility.canUnbond
    ? unbondEligibility.reason ?? 'UNBOND is only available when THORChain reports this node as Standby.'
    : null;
  const bondReviewAction = !sourceSafety.canPrepareBond
    ? {
        detail: sourceSafety.detail,
        href: buildNodeRiskHref(address, position.nodeAddress, 'risk-source-confidence'),
        label: 'Review source confidence',
        statusLabel: sourceSafety.statusLabel,
      }
    : requiresBondReview
      ? {
          detail: 'This node is flagged for provider review. Check jail, slash, churn, and yield-guard context before preparing a BOND memo.',
          href: buildNodeRiskHref(address, position.nodeAddress),
          label: 'Review exposure first',
          statusLabel: 'Provider review required',
        }
      : null;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3 relative group hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
          {position.nodeAddress.slice(0, 16)}...{position.nodeAddress.slice(-6)}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="relative"
            onMouseEnter={() => setIsScoreTooltipOpen(true)}
            onMouseLeave={() => setIsScoreTooltipOpen(false)}
          >
            <button
              type="button"
              className={`rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950 ${getGradeColor(health.grade)}`}
              aria-label={`Provider exposure grade ${health.grade}: ${health.reason}`}
              aria-describedby={isScoreTooltipOpen ? scoreTooltipId : undefined}
              onFocus={() => setIsScoreTooltipOpen(true)}
              onBlur={() => setIsScoreTooltipOpen(false)}
            >
              {health.grade}
            </button>
            {isScoreTooltipOpen && (
              <div id={scoreTooltipId} role="tooltip" className="absolute bottom-full right-0 z-50 mb-2 w-52 rounded border border-zinc-800 bg-zinc-900 p-2 text-[10px] text-white shadow-xl">
                <div className="flex items-center gap-1 mb-1 text-zinc-400 font-bold uppercase">
                  <Info className="w-3 h-3" />
                  Provider Exposure
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
            {isUsableDashboardMetric(position.totalBond) ? `${formatRuneDisplayNumber(position.totalBond, 0)} RUNE` : '--'}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Operator Fee</div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            {isUsableDashboardMetric(position.operatorFee) ? formatBasisPoints(position.operatorFee) : '--'}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Slash Points</div>
          <div className={cn('font-medium', hasElevatedSlash ? slashSeverity.className : 'text-zinc-900 dark:text-zinc-100')}>
            {formatDashboardNumber(position.slashPoints)}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Version</div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">v{position.version}</div>
        </div>
      </div>

      {/* Transaction prep actions */}
      <div className="grid grid-cols-1 gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800 sm:grid-cols-2">
        {bondReviewAction ? (
          <Link
            href={bondReviewAction.href}
            className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-2 text-center text-[11px] font-bold uppercase leading-tight text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{bondReviewAction.label}</span>
          </Link>
        ) : (
          <Link
            href={buildBondMemoHref(address, position.nodeAddress, 'bond')}
            className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded bg-emerald-50 px-2 py-2 text-center text-[11px] font-bold uppercase leading-tight text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <PlusCircle className="h-3 w-3 shrink-0" />
            Prepare BOND Memo
          </Link>
        )}
        {canPrepareUnbond && (
          <Link
            href={buildBondMemoHref(address, position.nodeAddress, 'unbond')}
            className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded bg-amber-50 px-2 py-2 text-center text-[11px] font-bold uppercase leading-tight text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            <MinusCircle className="h-3 w-3 shrink-0" />
            Prepare UNBOND Memo
          </Link>
        )}
        {unbondUnavailableReason && (
          <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400 sm:col-span-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">UNBOND unavailable: </span>
            {unbondUnavailableReason}
          </p>
        )}
        {bondReviewAction && (
          <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400 sm:col-span-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{bondReviewAction.statusLabel}: </span>
            {bondReviewAction.detail}
          </p>
        )}
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

      {hasElevatedSlash && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-600 dark:text-orange-400">
          <Server className="w-3.5 h-3.5 shrink-0" />
          <span>{slashSeverity.label} slash exposure ({position.slashPoints.toLocaleString()} points)</span>
        </div>
      )}
    </div>
  );
}
