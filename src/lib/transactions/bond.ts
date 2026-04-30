'use client';

import type { OfflineSigner } from '@cosmjs/proto-signing';
import type { BondPosition } from '@/lib/types/node';
import '@/lib/types/wallet';
import { ENDPOINTS } from '../config';

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface TransactionParams {
  type: 'BOND' | 'UNBOND';
  nodeAddress: string;
  /** Human-readable RUNE amount entered by the user. */
  amount: string;
  memo: string;
  walletType: 'keplr' | 'xdefi' | 'vultisig';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const THORCHAIN_RPC = ENDPOINTS.rpc;
const THORCHAIN_CHAIN_ID = 'thorchain-mainnet-v1';
const RUNE_DECIMALS = 8;
const RUNE_BASE = 100_000_000n;
const THOR_ADDRESS_PATTERN = /^thor1[ac-hj-np-z02-9]{38,}$/;

export async function executeBondTransaction(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  const validation = validateTransactionParams(params);
  if (!validation.valid) return { success: false, error: validation.error };

  if (params.walletType === 'keplr') {
    return executeWithKeplr(params, signerAddress);
  } else if (params.walletType === 'xdefi') {
    return executeWithXdefi(params, signerAddress);
  } else {
    return executeWithVultisig(params, signerAddress);
  }
}

export async function executeUnbondTransaction(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  const validation = validateTransactionParams(params);
  if (!validation.valid) return { success: false, error: validation.error };

  if (params.walletType === 'keplr') {
    return executeWithKeplr(params, signerAddress);
  } else if (params.walletType === 'xdefi') {
    return executeWithXdefi(params, signerAddress);
  } else {
    return executeWithVultisig(params, signerAddress);
  }
}

function validateTransactionParams(params: TransactionParams): ValidationResult {
  const nodeValidation = validateThorAddress(params.nodeAddress, 'Node address');
  if (!nodeValidation.valid) return nodeValidation;

  const amountValidation = params.type === 'BOND'
    ? validateBondAmount(params.amount)
    : validateUnbondAmount(params.amount);
  if (!amountValidation.valid) return amountValidation;

  return { valid: true };
}

function getWalletDepositAmountBaseUnits(params: TransactionParams): string {
  if (params.type === 'UNBOND') {
    // The unbond request amount belongs in the memo, not in the deposited coin.
    // Wallet adapters still require an amount field, so keep the transfer amount at zero.
    return '0';
  }

  return parseRuneAmountToBaseUnits(params.amount) ?? '0';
}

async function executeWithKeplr(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  try {
    if (!window.keplr) {
      return { success: false, error: 'Keplr wallet not found' };
    }

    const { SigningStargateClient } = await import('@cosmjs/stargate');

    await window.keplr.enable(THORCHAIN_CHAIN_ID);
    const offlineSigner = window.keplr.getOfflineSigner(THORCHAIN_CHAIN_ID);

    const client = await SigningStargateClient.connectWithSigner(
      THORCHAIN_RPC,
      offlineSigner as unknown as OfflineSigner
    );

    const amount = {
      denom: 'rune',
      amount: getWalletDepositAmountBaseUnits(params),
    };

    const fee = {
      amount: [{ denom: 'rune', amount: '2000000' }],
      gas: '50000000',
    };

    const messages = [{
      typeUrl: '/types.MsgDeposit',
      value: {
        depositor: signerAddress,
        memo: params.memo,
        amount: [amount],
      },
    }];

    const result = await client.signAndBroadcast(
      signerAddress,
      messages,
      fee,
      ''
    );

    if (typeof result.code === 'number' && result.code !== 0) {
      return {
        success: false,
        error: result.rawLog || `Transaction broadcast failed with code ${result.code}`,
      };
    }

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

async function executeWithXdefi(
  params: TransactionParams,
  _signerAddress: string
): Promise<TransactionResult> {
  try {
    if (!window.xfi?.thorchain) {
      return { success: false, error: 'XDEFI wallet not found' };
    }

    const depositMsg = {
      type: params.type,
      to: params.nodeAddress,
      memo: params.memo,
      amount: getWalletDepositAmountBaseUnits(params),
      asset: 'rune',
    };

    const txHash = await window.xfi.thorchain.request({
      method: 'sendTransaction',
      params: [depositMsg],
    });

    return {
      success: true,
      txHash: txHash as string,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

async function executeWithVultisig(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  try {
    const vultisigProvider = window.vultisig?.thorchain || window.thorchain;
    if (!vultisigProvider) {
      return { success: false, error: 'Vultisig wallet not found' };
    }

    const depositParams = {
      type: params.type,
      to: params.nodeAddress,
      memo: params.memo,
      amount: getWalletDepositAmountBaseUnits(params),
      asset: 'rune',
      from_address: signerAddress,
    };

    const txHash = await vultisigProvider.request({
      method: 'deposit_transaction',
      params: [depositParams],
    });

    return {
      success: true,
      txHash: txHash as string,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

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

  if (BigInt(baseUnits) < 102_000_000n) {
    return { valid: false, error: 'Minimum bond amount is 1.02 RUNE' };
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

  if (cleanProviderAddress || cleanOperatorFee) {
    return `BOND:${cleanNodeAddress}:${cleanProviderAddress || ''}:${cleanOperatorFee || '0'}`;
  }
  return `BOND:${cleanNodeAddress}`;
}

export function generateUnbondMemo(nodeAddress: string, amount: string): string {
  const baseUnits = parseRuneAmountToBaseUnits(amount);
  return `UNBOND:${nodeAddress.trim()}:${baseUnits ?? '0'}`;
}
