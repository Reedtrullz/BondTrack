import { BondPosition } from '@/lib/types/node';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface PortfolioAlert {
  id: string;
  type: 'SLASH' | 'JAIL' | 'CHURN' | 'SATELLITE';
  severity: AlertSeverity;
  message: string;
  suggestion: string;
  actionLabel?: string;
  actionLink?: string;
}

/**
 * Analyzes portfolio positions and generates a list of actionable alerts.
 */
export function generatePortfolioAlerts(positions: BondPosition[]): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];

  if (positions.length === 0) return alerts;

  // 1. Critical: Jailed Nodes
  const jailedNodes = positions.filter(p => p.isJailed);
  if (jailedNodes.length > 0) {
    alerts.push({
      id: 'critical-jail',
      type: 'JAIL',
      severity: 'critical',
      message: `${jailedNodes.length} of your nodes are currently JAILED. Your bond is not earning rewards.`,
      suggestion: 'Wait for jail release or investigate node operator status.',
      actionLabel: 'View Risk Details',
      actionLink: '/dashboard/risk'
    });
  }

  // 2. Warning: High Slash Exposure
  const highSlashNodes = positions.filter(p => p.slashPoints >= 200);
  if (highSlashNodes.length > 0) {
    alerts.push({
      id: 'warning-slash',
      type: 'SLASH',
      severity: 'warning',
      message: `${highSlashNodes.length} node(s) have high slash exposure.`,
      suggestion: 'Review slash trend, jail context, and recent node status before changing provider exposure.',
      actionLabel: 'Review slash exposure',
      actionLink: '/dashboard/risk'
    });
  }

  // 3. Warning: Churn Risk
  const churnRiskNodes = positions.filter(p => p.yieldGuardFlags?.includes('lowest_bond'));
  if (churnRiskNodes.length > 0) {
    alerts.push({
      id: 'warning-churn',
      type: 'CHURN',
      severity: 'warning',
      message: `${churnRiskNodes.length} node(s) are at high risk of churning out of the active set.`,
      suggestion: 'Review churn-out context, active-set rank, and operator status before deciding whether to bond more or move exposure.',
      actionLabel: 'Review churn risk',
      actionLink: '/dashboard/risk'
    });
  }

  return alerts;
}
