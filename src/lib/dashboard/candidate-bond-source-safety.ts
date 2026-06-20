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
      detail: 'THORNode node set loaded for candidate scoring and provider-capacity checks. Wallet still presents the final BOND memo and fee for your approval.',
      severity: 'healthy',
      statusLabel: 'Source check passed',
      title: 'Source check passed',
      value: 'THORNode checked',
    };
  }

  if (thornodeStatus === 'unknown') {
    return {
      canPrepareBond: false,
      detail: 'THORNode candidate source check has not completed yet. Wait for current node-set data before reviewing or copying any BOND memo.',
      severity: 'info',
      statusLabel: 'Source pending',
      title: 'Wait for source check',
      value: 'THORNode pending',
    };
  }

  if (thornodeStatus === 'mock') {
    return {
      canPrepareBond: false,
      detail: 'Local mock data is enabled. Treat candidate status and provider capacity as illustrative only; do not review or copy BOND memos from demo data.',
      severity: 'warning',
      statusLabel: 'Demo data only',
      title: 'Demo data only',
      value: 'THORNode mock',
    };
  }

  return {
    canPrepareBond: false,
    detail: `THORNode candidate source check is ${thornodeStatus}. Treat candidate status and provider capacity as unverified before reviewing or copying any BOND memo.`,
    severity: 'warning',
    statusLabel: 'Source degraded',
    title: 'Wait for source check',
    value: `THORNode ${thornodeStatus}`,
  };
}
