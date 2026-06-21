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
import { LEDGER_BROADCAST_UNAVAILABLE_MESSAGE } from '@/lib/wallet/ledger-thorchain';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';

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
  walletType: 'keplr' | 'xdefi' | 'vultisig' | 'ledger';
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
  } else if (params.walletType === 'vultisig') {
    return executeWithVultisig(validation.intent);
  }

  return executeWithLedger();
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
  } else if (params.walletType === 'vultisig') {
    return executeWithVultisig(validation.intent);
  }

  return executeWithLedger();
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

    const txHashResult = await window.xfi.thorchain.request({
      method: 'sendTransaction',
      params: [depositMsg],
    });

    const txHash = normalizeWalletTransactionHash(txHashResult);
    if (!txHash) {
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

    const currentSigner = await readCurrentVultisigSigner(vultisigProvider);
    if (currentSigner !== intent.signerAddress) {
      return { success: false, error: 'Vultisig signer changed before broadcast. Reconnect the wallet and review again.' };
    }

    const depositParams = {
      type: intent.type,
      to: intent.nodeAddress,
      memo: intent.memo,
      amount: intent.walletDepositAmountBaseUnits,
      asset: 'rune',
      from_address: intent.signerAddress,
    };

    const txHashResult = await vultisigProvider.request({
      method: 'deposit_transaction',
      params: [depositParams],
    });

    const txHash = normalizeWalletTransactionHash(txHashResult);
    if (!txHash) {
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

async function executeWithLedger(): Promise<TransactionResult> {
  return {
    success: false,
    error: LEDGER_BROADCAST_UNAVAILABLE_MESSAGE,
  };
}

function normalizeWalletTransactionHash(result: unknown): string | null {
  if (typeof result === 'string') {
    const trimmed = result.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!result || typeof result !== 'object') return null;

  const record = result as Record<string, unknown>;
  const candidates = [
    record.txHash,
    record.txhash,
    record.hash,
    record.transactionHash,
    record.transaction_hash,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return null;
}

async function readCurrentVultisigSigner(
  provider: NonNullable<Window['thorchain']>
): Promise<string> {
  const methods = ['get_accounts', 'request_accounts', 'connect'] as const;

  for (const method of methods) {
    try {
      const result = await provider.request({ method });
      const address = normalizeWalletAddressResult(result, 'Vultisig');
      if (address) return address;
    } catch (error) {
      if (isUnsupportedProviderMethod(error)) continue;
      throw error;
    }
  }

  throw new Error('Vultisig signer could not be verified before broadcast. Reconnect the wallet and review again.');
}

function normalizeWalletAddressResult(result: unknown, walletName: string): string | null {
  const address = extractWalletAddressString(result);
  if (!address) return null;

  const normalized = normalizeTHORChainMainnetAddress(address);
  if (!normalized) {
    throw new Error(`${walletName} returned an invalid THORChain mainnet address before broadcast.`);
  }

  return normalized;
}

function extractWalletAddressString(result: unknown): string | null {
  if (typeof result === 'string') return result;

  if (Array.isArray(result)) {
    const [firstAccount] = result;
    return extractWalletAddressString(firstAccount);
  }

  if (!result || typeof result !== 'object') return null;

  const record = result as Record<string, unknown>;
  if (typeof record.address === 'string') return record.address;
  if (typeof record.bech32Address === 'string') return record.bech32Address;

  if (Array.isArray(record.accounts)) {
    const [firstAccount] = record.accounts;
    return extractWalletAddressString(firstAccount);
  }

  return null;
}

function isUnsupportedProviderMethod(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as Record<string, unknown>;
  if (record.code === 4200) return true;

  const message = typeof record.message === 'string' ? record.message : '';
  return /unsupported|unknown method|not supported|unexpected vultisig method/i.test(message);
}
