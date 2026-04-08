import { BondPosition } from '@/lib/types/node';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface PortfolioAlert {
  id: string;
  type: 'SLASH' | 'JAIL' | 'CHURN' | 'SATELLITE';
  severity: AlertSeverity;
  message: string;
  actionLabel?: string;
  actionLink?: string; // This should now be a relative path, handled by the component
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
      actionLabel: 'View Risk Details',
      actionLink: '/dashboard/risk'
    });
  }

  // 2. Warning: High Slash Points
  const highSlashNodes = positions.filter(p => p.slashPoints >= 200);
  if (highSlashNodes.length > 0) {
    alerts.push({
      id: 'warning-slash',
      type: 'SLASH',
      severity: 'warning',
      message: `High slash points detected on ${highSlashNodes.length} node(s). Risk of jail is elevated.`,
      actionLabel: 'Check Slash Monitor',
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
      actionLabel: 'Optimize Bond',
      actionLink: '/dashboard/transactions'
    });
  }

  return alerts;
}
