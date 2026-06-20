import type { BondPosition } from '@/lib/types/node';
import {
  isValidTHORChainMainnetAddress,
  normalizeTHORChainMainnetAddress,
} from '@/lib/utils/address-validation';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface CanonicalTransactionIntent {
  type: 'BOND' | 'UNBOND';
  nodeAddress: string;
  signerAddress: string;
  memo: string;
  walletDepositAmountBaseUnits: string;
  unbondAmountBaseUnits?: string;
  providerAddress?: string;
  operatorFeeBps?: string;
}

export interface TransactionIntentInput {
  type: 'BOND' | 'UNBOND';
  nodeAddress: string;
  amount: string;
  memo: string;
  signerAddress: string;
}

export type TransactionIntentValidationResult = ValidationResult & {
  intent?: CanonicalTransactionIntent;
};

const RUNE_BASE = 100_000_000n;
const RUNE_DECIMALS = 8;
const MIN_BOND_BASE_UNITS = RUNE_BASE;
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
  const trimmed = address.trim();
  if (!isValidTHORChainMainnetAddress(trimmed)) {
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
    return { valid: false, error: 'Minimum bond amount is 1 RUNE; wallet/network fees are shown separately' };
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
  const cleanNodeAddress = normalizeTHORChainMainnetAddress(nodeAddress) ?? nodeAddress.trim();
  const cleanProviderAddress = providerAddress
    ? normalizeTHORChainMainnetAddress(providerAddress) ?? providerAddress.trim()
    : undefined;
  const cleanOperatorFee = operatorFee?.trim();

  if (cleanProviderAddress) {
    return `BOND:${cleanNodeAddress}:${cleanProviderAddress}:${cleanOperatorFee || '0'}`;
  }
  return `BOND:${cleanNodeAddress}`;
}

export function generateUnbondMemo(nodeAddress: string, amount: string): string {
  const baseUnits = parseRuneAmountToBaseUnits(amount);
  const cleanNodeAddress = normalizeTHORChainMainnetAddress(nodeAddress) ?? nodeAddress.trim();
  return `UNBOND:${cleanNodeAddress}:${baseUnits ?? '0'}`;
}

export function validateTransactionIntent(input: TransactionIntentInput): TransactionIntentValidationResult {
  const nodeAddress = normalizeTHORChainMainnetAddress(input.nodeAddress);
  if (!nodeAddress) {
    return { valid: false, error: 'Node address must be a valid THORChain address' };
  }

  const signerAddress = normalizeTHORChainMainnetAddress(input.signerAddress);
  if (!signerAddress) {
    return { valid: false, error: 'Connected wallet must expose a valid THORChain mainnet address' };
  }

  const amountValidation = input.type === 'BOND'
    ? validateBondAmount(input.amount)
    : validateUnbondAmount(input.amount);
  if (!amountValidation.valid) return amountValidation;

  const amountBaseUnits = parseRuneAmountToBaseUnits(input.amount);
  if (!amountBaseUnits) {
    return { valid: false, error: 'Amount must be a positive RUNE value with up to 8 decimals' };
  }

  const memo = input.memo.trim();
  const parts = memo.split(':');
  const memoType = parts[0]?.toUpperCase();

  if (memoType !== input.type) {
    return { valid: false, error: `${input.type} form state does not match the generated memo type` };
  }

  if (input.type === 'BOND') {
    if (parts.length !== 2 && parts.length !== 4) {
      return { valid: false, error: 'BOND memo must be BOND:<node> or BOND:<node>:<provider>:<fee bps>' };
    }

    const memoNodeAddress = normalizeTHORChainMainnetAddress(parts[1] ?? '');
    if (!memoNodeAddress || memoNodeAddress !== nodeAddress) {
      return { valid: false, error: 'BOND memo node does not match the selected node address' };
    }

    if (parts.length === 4) {
      const providerAddress = normalizeTHORChainMainnetAddress(parts[2] ?? '');
      const operatorFeeBps = parts[3]?.trim() ?? '';
      const optionsValidation = validateBondMemoOptions(parts[2] ?? '', operatorFeeBps);
      if (!optionsValidation.valid) return optionsValidation;
      if (!providerAddress) {
        return { valid: false, error: 'Provider address must be a valid THORChain address' };
      }

      const canonicalMemo = generateBondMemo(nodeAddress, providerAddress, operatorFeeBps);
      if (memo !== canonicalMemo) {
        return { valid: false, error: 'BOND memo is not canonical for the selected node, provider, and fee' };
      }

      return {
        valid: true,
        intent: {
          type: 'BOND',
          nodeAddress,
          signerAddress,
          memo: canonicalMemo,
          walletDepositAmountBaseUnits: amountBaseUnits,
          providerAddress,
          operatorFeeBps,
        },
      };
    }

    const canonicalMemo = generateBondMemo(nodeAddress);
    if (memo !== canonicalMemo) {
      return { valid: false, error: 'BOND memo is not canonical for the selected node address' };
    }

    return {
      valid: true,
      intent: {
        type: 'BOND',
        nodeAddress,
        signerAddress,
        memo: canonicalMemo,
        walletDepositAmountBaseUnits: amountBaseUnits,
      },
    };
  }

  if (parts.length !== 3) {
    return { valid: false, error: 'UNBOND memo must be UNBOND:<node>:<amount in 1e8 base units>' };
  }

  const memoNodeAddress = normalizeTHORChainMainnetAddress(parts[1] ?? '');
  if (!memoNodeAddress || memoNodeAddress !== nodeAddress) {
    return { valid: false, error: 'UNBOND memo node does not match the selected node address' };
  }

  if (parts[2] !== amountBaseUnits) {
    return { valid: false, error: 'UNBOND memo amount does not match the requested amount' };
  }

  const canonicalMemo = generateUnbondMemo(nodeAddress, input.amount);
  if (memo !== canonicalMemo) {
    return { valid: false, error: 'UNBOND memo is not canonical for the selected node and amount' };
  }

  return {
    valid: true,
    intent: {
      type: 'UNBOND',
      nodeAddress,
      signerAddress,
      memo: canonicalMemo,
      walletDepositAmountBaseUnits: '0',
      unbondAmountBaseUnits: amountBaseUnits,
    },
  };
}
