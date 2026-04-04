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
  if (params.walletType === 'keplr') {
    return executeWithKeplr(params, signerAddress);
  } else if (params.walletType === 'xdefi') {
    return executeWithXdefi(params, signerAddress);
  } else {
    return executeWithVultisig(params, signerAddress);
  }
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
      amount: (parseFloat(params.amount) * 1e8).toFixed(0),
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
  signerAddress: string
): Promise<TransactionResult> {
  try {
    if (!window.xfi?.thorchain) {
      return { success: false, error: 'XDEFI wallet not found' };
    }

    const txType = params.type === 'BOND' ? 'BOND' : 'UNBOND';
    
    const depositMsg = {
      type: txType,
      to: params.nodeAddress,
      memo: params.memo,
      amount: params.amount,
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

    // VultiConnect uses deposit_transaction method for THORChain
    const depositParams = {
      type: params.type,
      to: params.nodeAddress,
      memo: params.memo,
      amount: params.amount,
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

export function validateBondAmount(amount: string): { valid: boolean; error?: string } {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (num < 1.02) {
    return { valid: false, error: 'Minimum bond amount is 1.02 RUNE' };
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
  if (providerAddress || operatorFee) {
    return `BOND:${nodeAddress}:${providerAddress || ''}:${operatorFee || '0'}`;
  }
  return `BOND:${nodeAddress}`;
}

export function generateUnbondMemo(nodeAddress: string, amount: string): string {
  return `UNBOND:${nodeAddress}:${amount}`;
}
