export const ENDPOINTS = {
  thornode: process.env.NEXT_PUBLIC_THORNODE_API || 'https://gateway.liquify.com/chain/thorchain_api',
  midgard: process.env.NEXT_PUBLIC_MIDGARD_API || 'https://gateway.liquify.com/chain/thorchain_midgard',
  rpc: process.env.NEXT_PUBLIC_THORCHAIN_RPC || 'https://rpc.thorchain.info',
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
} as const;
// Triggering fresh Vercel build
