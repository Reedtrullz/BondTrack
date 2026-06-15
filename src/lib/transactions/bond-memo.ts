import type { BondPosition } from '@/lib/types/node';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const RUNE_BASE = 100_000_000n;
const RUNE_DECIMALS = 8;
const MIN_BOND_BASE_UNITS = RUNE_BASE;
const THOR_ADDRESS_PATTERN = /^thor1[ac-hj-np-z02-9]{38,}$/;

export function parseRuneAmountToBaseUnits(amount: string): string | null {
  const trimmed = amount.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(trimmed)) {
    return null;
  }

  const [wholePart, fractionPart = ''] = trimmed.split('.');
  const whole = BigInt(wholePart) * RUNE_BASE;
  const fraction = BigInt(fractionPart.padEnd(RUNE_DECIMALS, '0'));
  const baseUnits = whole + fraction;

  if (baseUnits <= 0n) return null;
  return baseUnits.toString();
}

export function validateThorAddress(address: string, label = 'THORChain address'): ValidationResult {
  const trimmed = address.trim().toLowerCase();
  if (!THOR_ADDRESS_PATTERN.test(trimmed)) {
    return { valid: false, error: `${label === 'THORChain address' ? 'Invalid THORChain address format' : `${label} must be a valid THORChain address`}` };
  }
  return { valid: true };
}

export function validateBondAmount(amount: string): ValidationResult {
  const baseUnits = parseRuneAmountToBaseUnits(amount);
  if (!baseUnits) {
    return { valid: false, error: 'Amount must be a positive RUNE value with up to 8 decimals' };
  }

  if (BigInt(baseUnits) < MIN_BOND_BASE_UNITS) {
    return { valid: false, error: 'Minimum bond amount is 1 RUNE; wallet/network fees are confirmed separately' };
  }

  return { valid: true };
}

export function validateUnbondAmount(amount: string, maxRuneAmount?: number): ValidationResult {
  const baseUnits = parseRuneAmountToBaseUnits(amount);
  if (!baseUnits) {
    return { valid: false, error: 'Amount must be a positive RUNE value with up to 8 decimals' };
  }

  if (typeof maxRuneAmount === 'number' && Number.isFinite(maxRuneAmount)) {
    const maxBaseUnits = BigInt(Math.floor(maxRuneAmount * 1e8));
    if (BigInt(baseUnits) > maxBaseUnits) {
      return { valid: false, error: 'Amount exceeds bonded balance for this node' };
    }
  }

  return { valid: true };
}

export function validateBondMemoOptions(providerAddress?: string, operatorFee?: string): ValidationResult {
  const cleanProviderAddress = providerAddress?.trim() ?? '';
  const hasProvider = cleanProviderAddress.length > 0;
  const hasOperatorFee = operatorFee !== undefined && operatorFee !== '';

  if (hasOperatorFee && !hasProvider) {
    return { valid: false, error: 'Provider address is required when operator fee is set' };
  }

  if (hasProvider) {
    const providerValidation = validateThorAddress(cleanProviderAddress, 'Provider address');
    if (!providerValidation.valid) return providerValidation;
  }

  if (!hasOperatorFee) return { valid: true };

  const cleanOperatorFee = operatorFee.trim();
  if (!/^\d+$/.test(cleanOperatorFee)) {
    return { valid: false, error: 'Operator fee must be a whole number between 0 and 10000 basis points' };
  }

  if (BigInt(cleanOperatorFee) > 10_000n) {
    return { valid: false, error: 'Operator fee must be between 0 and 10000 basis points' };
  }

  return { valid: true };
}

export function canUnbondNode(position: BondPosition): { canUnbond: boolean; reason?: string } {
  if (position.status === 'Active') {
    return {
      canUnbond: false,
      reason: 'Node must be in Standby status to unbond. Wait for the next churn.',
    };
  }
  if (position.status === 'Jailed') {
    return {
      canUnbond: false,
      reason: 'Node is jailed. Cannot unbond until released.',
    };
  }
  if (position.status !== 'Standby') {
    return {
      canUnbond: false,
      reason: 'Node must be in Standby status to unbond.',
    };
  }
  return { canUnbond: true };
}

export function generateBondMemo(nodeAddress: string, providerAddress?: string, operatorFee?: string): string {
  const cleanNodeAddress = nodeAddress.trim();
  const cleanProviderAddress = providerAddress?.trim();
  const cleanOperatorFee = operatorFee?.trim();

  if (cleanProviderAddress) {
    return `BOND:${cleanNodeAddress}:${cleanProviderAddress}:${cleanOperatorFee || '0'}`;
  }
  return `BOND:${cleanNodeAddress}`;
}

export function generateUnbondMemo(nodeAddress: string, amount: string): string {
  const baseUnits = parseRuneAmountToBaseUnits(amount);
  return `UNBOND:${nodeAddress.trim()}:${baseUnits ?? '0'}`;
}
