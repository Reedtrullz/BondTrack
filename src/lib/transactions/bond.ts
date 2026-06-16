'use client';

import type { OfflineSigner } from '@cosmjs/proto-signing';
import '@/lib/types/wallet';
import { ENDPOINTS } from '../config';
import { THORCHAIN_MAINNET_CHAIN_ID } from '@/lib/thorchain';
import {
  validateTransactionIntent,
  type CanonicalTransactionIntent,
  type ValidationResult,
} from './bond-memo';
import {
  createRuneDepositMessage,
  createThorchainSigningRegistry,
  THORCHAIN_DEPOSIT_GAS_LIMIT,
  THORCHAIN_MSG_DEPOSIT_TYPE_URL,
} from './thorchain-msg-deposit';

export { validateThorAddress, validateBondAmount, validateUnbondAmount, validateBondMemoOptions, validateTransactionIntent, canUnbondNode, generateBondMemo, generateUnbondMemo, parseRuneAmountToBaseUnits, type CanonicalTransactionIntent, type ValidationResult } from './bond-memo';

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
const THORCHAIN_CHAIN_ID = THORCHAIN_MAINNET_CHAIN_ID;

export async function executeBondTransaction(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  if (params.type !== 'BOND') {
    return { success: false, error: 'Bond transaction must use a BOND intent' };
  }

  const validation = validateTransactionParams(params, signerAddress);
  if (!validation.valid) return { success: false, error: validation.error };
  if (!validation.intent) return { success: false, error: 'Transaction intent could not be verified' };

  if (params.walletType === 'keplr') {
    return executeWithKeplr(validation.intent);
  } else if (params.walletType === 'xdefi') {
    return executeWithXdefi(validation.intent);
  } else {
    return executeWithVultisig(validation.intent);
  }
}

export async function executeUnbondTransaction(
  params: TransactionParams,
  signerAddress: string
): Promise<TransactionResult> {
  if (params.type !== 'UNBOND') {
    return { success: false, error: 'Unbond transaction must use an UNBOND intent' };
  }

  const validation = validateTransactionParams(params, signerAddress);
  if (!validation.valid) return { success: false, error: validation.error };
  if (!validation.intent) return { success: false, error: 'Transaction intent could not be verified' };

  if (params.walletType === 'keplr') {
    return executeWithKeplr(validation.intent);
  } else if (params.walletType === 'xdefi') {
    return executeWithXdefi(validation.intent);
  } else {
    return executeWithVultisig(validation.intent);
  }
}

function validateTransactionParams(
  params: TransactionParams,
  signerAddress: string
): ValidationResult & { intent?: CanonicalTransactionIntent } {
  return validateTransactionIntent({
    type: params.type,
    nodeAddress: params.nodeAddress,
    amount: params.amount,
    memo: params.memo,
    signerAddress,
  });
}

async function executeWithKeplr(
  intent: CanonicalTransactionIntent
): Promise<TransactionResult> {
  try {
    if (!window.keplr) {
      return { success: false, error: 'Keplr wallet not found' };
    }

    const { SigningStargateClient } = await import('@cosmjs/stargate');

    await window.keplr.enable(THORCHAIN_CHAIN_ID);

    const chainId = await window.keplr.getChainId(THORCHAIN_CHAIN_ID);
    if (chainId !== THORCHAIN_CHAIN_ID) {
      return { success: false, error: 'Keplr is not connected to THORChain mainnet' };
    }

    const key = await window.keplr.getKey(THORCHAIN_CHAIN_ID);
    if (key.bech32Address.trim().toLowerCase() !== intent.signerAddress) {
      return { success: false, error: 'Keplr signer changed before broadcast. Reconnect the wallet and review again.' };
    }

    const offlineSigner = window.keplr.getOfflineSigner(THORCHAIN_CHAIN_ID);

    const client = await SigningStargateClient.connectWithSigner(
      THORCHAIN_RPC,
      offlineSigner as unknown as OfflineSigner,
      { registry: createThorchainSigningRegistry() }
    );

    const fee = {
      amount: [],
      gas: THORCHAIN_DEPOSIT_GAS_LIMIT,
    };

    const messages = [{
      typeUrl: THORCHAIN_MSG_DEPOSIT_TYPE_URL,
      value: createRuneDepositMessage(
        intent.signerAddress,
        intent.memo,
        intent.walletDepositAmountBaseUnits
      ),
    }];

    const result = await client.signAndBroadcast(
      intent.signerAddress,
      messages,
      fee,
      intent.memo
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
  intent: CanonicalTransactionIntent
): Promise<TransactionResult> {
  try {
    if (!window.xfi?.thorchain) {
      return { success: false, error: 'XDEFI wallet not found' };
    }

    const depositMsg = {
      type: intent.type,
      to: intent.nodeAddress,
      memo: intent.memo,
      amount: intent.walletDepositAmountBaseUnits,
      asset: 'rune',
    };

    const txHash = await window.xfi.thorchain.request({
      method: 'sendTransaction',
      params: [depositMsg],
    });

    if (typeof txHash !== 'string' || txHash.trim().length === 0) {
      return { success: false, error: 'XDEFI returned an invalid transaction hash' };
    }

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

async function executeWithVultisig(
  intent: CanonicalTransactionIntent
): Promise<TransactionResult> {
  try {
    const vultisigProvider = window.vultisig?.thorchain || window.thorchain;
    if (!vultisigProvider) {
      return { success: false, error: 'Vultisig wallet not found' };
    }

    const depositParams = {
      type: intent.type,
      to: intent.nodeAddress,
      memo: intent.memo,
      amount: intent.walletDepositAmountBaseUnits,
      asset: 'rune',
      from_address: intent.signerAddress,
    };

    const txHash = await vultisigProvider.request({
      method: 'deposit_transaction',
      params: [depositParams],
    });

    if (typeof txHash !== 'string' || txHash.trim().length === 0) {
      return { success: false, error: 'Vultisig returned an invalid transaction hash' };
    }

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}
