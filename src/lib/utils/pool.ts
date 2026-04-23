/**
 * Parse asset names from THORChain pool string.
 * @param pool - Pool string in format "CHAIN.ASSET" or "ASSET.ASSET"
 * @returns Object with rune and asset names
 */
import { getLpAssetSymbol } from './lp-analytics';

export function getAssetName(pool: string): { rune: string; asset: string } {
  return {
    rune: 'RUNE',
    asset: getLpAssetSymbol(pool),
  };
}
