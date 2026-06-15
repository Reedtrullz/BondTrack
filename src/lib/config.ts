export const ENDPOINTS = {
  thornode: process.env.NEXT_PUBLIC_THORNODE_API || 'https://gateway.liquify.com/chain/thorchain_api',
  midgard: process.env.NEXT_PUBLIC_MIDGARD_API || 'https://gateway.liquify.com/chain/thorchain_midgard',
  rpc: process.env.NEXT_PUBLIC_THORCHAIN_RPC || 'https://gateway.liquify.com/chain/thorchain_rpc',
  track: process.env.NEXT_PUBLIC_TRACK_API || 'https://track.thorchain.org/',
  fallbackMidgard: process.env.NEXT_PUBLIC_MIDGARD_FALLBACK || 'https://midgard.thorchain.network',
} as const;

export const NETWORK = {
  CHURN_INTERVAL_BLOCKS: 43200,
  CHURN_INTERVAL_SECONDS: 43200 * 6, // ~2.5 days
  CHURNS_PER_YEAR: 365 / 2.5, // ~146
  RUNE_DECIMALS: 8,
  MINIMUM_BOND_RUNE: 1_000_000_000_000, // 10,000 RUNE in 1e8
  DESIRED_VALIDATOR_SET: 100,
  MAX_BOND_PROVIDERS: 6,
  SLASH_POINT_THRESHOLDS: {
    warning: 50,
    critical: 200,
  },
  HEALTH_SCORE_THRESHOLDS: {
    healthy: 80,
    warning: 50,
  },
  BOND_TO_POOL_THRESHOLDS: {
    underSecured: 1.0,
    building: 1.5,
    healthy: 2.5,
  },
  NODE_SEVERITY_SCORES: {
    criticalSlash: 50,
    warningSlash: 25,
    minorSlash: 10,
    jailed: 100,
    highRisk: 25,
  },
  HEALTH_SCORE_RULES: {
    startingPoints: 100,
    jailedPenalty: 40,
    criticalSlashPenalty: 20,
    criticalSlashMagnitudeDivisor: 1000,
    warningSlashPenalty: 8,
    atRiskPenalty: 5,
    nonActivePenalty: 25,
    gradeThresholds: {
      f: 40,
      d: 60,
      c: 75,
      b: 90,
      a: 100,
    },
  },
  PROGRESS_BAR_MULTIPLIER: 33,
  MAX_ACTIONS_LIMIT: 50,
  REFRESH_INTERVALS: {
    bondPositions: 60000,
    earnings: 300000,
    price: 300000,
    health: 30000,
  },
} as const;
