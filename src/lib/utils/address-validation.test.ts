import { describe, expect, it } from 'vitest';

import {
  isValidTHORChainAddress,
  isValidTHORChainMainnetAddress,
  normalizeTHORChainMainnetAddress,
  validateTHORChainAddress,
} from './address-validation';

const MAINNET_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const TESTNET_ADDRESS = 'tthor1qyqszqgpqyqszqgpqyqszqgpqyqszqgpsrf4px';

describe('THORChain address validation', () => {
  it('accepts checksum-valid THORChain bech32 addresses', () => {
    expect(isValidTHORChainAddress(MAINNET_ADDRESS)).toBe(true);
    expect(isValidTHORChainAddress(TESTNET_ADDRESS)).toBe(true);
    expect(normalizeTHORChainMainnetAddress(MAINNET_ADDRESS.toUpperCase())).toBe(MAINNET_ADDRESS);
  });

  it('rejects regex-shaped addresses with invalid checksums', () => {
    const invalidChecksumAddress = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cx';

    expect(isValidTHORChainAddress(invalidChecksumAddress)).toBe(false);
    expect(validateTHORChainAddress(invalidChecksumAddress)).toMatchObject({
      valid: false,
      error: 'Address checksum is invalid',
    });
  });

  it('can require mainnet addresses for wallet and transaction flows', () => {
    expect(isValidTHORChainMainnetAddress(MAINNET_ADDRESS)).toBe(true);
    expect(isValidTHORChainMainnetAddress(TESTNET_ADDRESS)).toBe(false);
    expect(normalizeTHORChainMainnetAddress(TESTNET_ADDRESS)).toBeNull();
  });
});
