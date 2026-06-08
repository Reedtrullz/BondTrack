'use client';

import type { OfflineSigner } from '@cosmjs/proto-signing';
import type { BondPosition } from '@/lib/types/node';
import '@/lib/types/wallet';
import { ENDPOINTS } from '../config';
import {
  parseRuneAmountToBaseUnits,
  validateThorAddress,
  validateBondAmount,
  validateUnbondAmount,
  type ValidationResult,
} from './bond-memo';

export { validateThorAddress, validateBondAmount, validateUnbondAmount, validateBondMemoOptions, canUnbondNode, generateBondMemo, generateUnbondMemo, parseRuneAmountToBaseUnits, type ValidationResult } from './bond-memo';

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

const THORCHAIN_RPC = ENDPOINTS.rpc;
const THORCHAIN_CHAIN_ID = 'thorchain-mainnet-v1';

export async function executeBondTransaction(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  const validation = validateTransactionParams(params);
  if (!validation.valid) return { success: false, error: validation.error };

  if (params.walletType === 'keplr') {
    return executeWithKeplr(params, signerAddress);
  } else if (params.walletType === 'xdefi') {
    return executeWithXdefi(params);
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
    return executeWithXdefi(params);
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
  params: TransactionParams
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
