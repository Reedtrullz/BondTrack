/**
 * Parse asset names from THORChain pool string.
 * @param pool - Pool string in format "CHAIN.ASSET" or "ASSET.ASSET"
 * @returns Object with rune and asset names
 */
export function getAssetName(pool: string): { rune: string; asset: string } {
  const parts = pool.split('.');
  
  if (parts.length === 1) {
    return { rune: 'RUNE', asset: parts[0] || 'Unknown' };
  }
  
  const [asset, chain] = parts;
  
  return {
    rune: 'RUNE',
    asset: asset || chain || 'Unknown'
  };
}
