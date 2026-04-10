export interface LpPosition {
  address: string;
  pool: string;
  bondedRune: string;
  rewards: string;
  apy: number;
  healthScore: number;
  slashRisk: number;
  status: 'active' | 'standby' | 'jailed' | 'at-risk';
  unbondWindowRemaining: number; // in hours
}

export interface LpDashboardStats {
  totalBondedRune: string;
  weightedApy: number;
  averageHealthScore: number;
  totalRewards: string;
}
