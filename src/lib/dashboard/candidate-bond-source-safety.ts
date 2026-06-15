import type { ApiHealthStatus } from '@/lib/hooks/use-api-health';
import type { InsightSeverity } from './insights';

export interface CandidateBondSourceSafety {
  canPrepareBond: boolean;
  detail: string;
  severity: InsightSeverity;
  statusLabel: string;
  title: string;
  value: string;
}

export function getCandidateBondSourceSafety(thornodeStatus: ApiHealthStatus): CandidateBondSourceSafety {
  if (thornodeStatus === 'healthy') {
    return {
      canPrepareBond: true,
      detail: 'THORNode node set is fresh enough to prepare candidate BOND memos.',
      severity: 'healthy',
      statusLabel: 'Source fresh',
      title: 'Source confidence fresh',
      value: 'THORNode fresh',
    };
  }

  if (thornodeStatus === 'unknown') {
    return {
      canPrepareBond: false,
      detail: 'THORNode source confidence has not completed yet. Wait for a fresh source check before preparing any BOND memo.',
      severity: 'info',
      statusLabel: 'Source pending',
      title: 'Wait for source confidence',
      value: 'THORNode pending',
    };
  }

  return {
    canPrepareBond: false,
    detail: `THORNode source confidence is ${thornodeStatus}. Treat candidate status and provider capacity as unverified before preparing any BOND memo.`,
    severity: 'warning',
    statusLabel: 'Source degraded',
    title: 'Wait for source confidence',
    value: `THORNode ${thornodeStatus}`,
  };
}
