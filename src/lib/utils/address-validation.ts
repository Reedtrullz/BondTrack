import { fromBech32, normalizeBech32 } from '@cosmjs/encoding';

export const THORCHAIN_ADDRESS_REGEX = /^(?:t?thor)1[ac-hj-np-z02-9]{38,59}$/;

export interface THORChainAddressValidationOptions {
  allowedPrefixes?: readonly string[];
}

export interface THORChainAddressValidationResult {
  valid: boolean;
  normalized?: string;
  prefix?: string;
  error?: string;
}

const DEFAULT_ALLOWED_PREFIXES = ['thor', 'tthor'] as const;
const MAINNET_ALLOWED_PREFIXES = ['thor'] as const;
const THORCHAIN_ADDRESS_BYTES = 20;

export function validateTHORChainAddress(
  address: string,
  options: THORChainAddressValidationOptions = {}
): THORChainAddressValidationResult {
  const trimmed = address.trim();
  const allowedPrefixes = options.allowedPrefixes ?? DEFAULT_ALLOWED_PREFIXES;

  if (!THORCHAIN_ADDRESS_REGEX.test(trimmed.toLowerCase())) {
    return { valid: false, error: 'Address format is not a THORChain bech32 address' };
  }

  try {
    const decoded = fromBech32(trimmed);
    if (!allowedPrefixes.includes(decoded.prefix)) {
      return {
        valid: false,
        prefix: decoded.prefix,
        error: `Address prefix ${decoded.prefix} is not allowed here`,
      };
    }

    if (decoded.data.length !== THORCHAIN_ADDRESS_BYTES) {
      return {
        valid: false,
        prefix: decoded.prefix,
        error: 'Address payload length is not a THORChain account address',
      };
    }

    return {
      valid: true,
      normalized: normalizeBech32(trimmed),
      prefix: decoded.prefix,
    };
  } catch {
    return { valid: false, error: 'Address checksum is invalid' };
  }
}

export function isValidTHORChainAddress(address: string): boolean {
  return validateTHORChainAddress(address).valid;
}

export function isValidTHORChainMainnetAddress(address: string): boolean {
  return validateTHORChainAddress(address, { allowedPrefixes: MAINNET_ALLOWED_PREFIXES }).valid;
}

export function normalizeTHORChainMainnetAddress(address: string): string | null {
  const result = validateTHORChainAddress(address, { allowedPrefixes: MAINNET_ALLOWED_PREFIXES });
  return result.valid ? result.normalized ?? address.trim().toLowerCase() : null;
}
