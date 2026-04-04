'use client';

import { useState, useEffect, useMemo } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { useWallet } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Wallet, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { TransactionPreview, type TransactionPreviewData } from '@/components/wallet/transaction-preview';
import { 
  executeBondTransaction, 
  executeUnbondTransaction,
  validateBondAmount, 
  canUnbondNode,
  generateBondMemo,
  generateUnbondMemo,
} from '@/lib/transactions/bond';

type Mode = 'BOND' | 'UNBOND';

interface TransactionComposerProps {
  positions: BondPosition[];
}

export function TransactionComposer({ positions }: TransactionComposerProps) {
  const [mode, setMode] = useState<Mode>('BOND');
  const [nodeAddress, setNodeAddress] = useState('');
  const [bondProviderAddress, setBondProviderAddress] = useState('');
  const [nodeOperatorFee, setNodeOperatorFee] = useState('');
  const [amountToUnbond, setAmountToUnbond] = useState('0');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);

  const { address, walletType, isConnected, isNetworkMismatch } = useWallet();

  const selectedPosition = useMemo(() => {
    return positions.find(p => p.nodeAddress === nodeAddress);
  }, [positions, nodeAddress]);

  useEffect(() => {
    if (positions.length > 0 && !nodeAddress) {
      setNodeAddress(positions[0].nodeAddress);
    }
  }, [positions, nodeAddress]);

  const memo = useMemo(() => {
    if (mode === 'BOND') {
      return generateBondMemo(nodeAddress, bondProviderAddress, nodeOperatorFee);
    }
    return generateUnbondMemo(nodeAddress, amountToUnbond);
  }, [mode, nodeAddress, bondProviderAddress, nodeOperatorFee, amountToUnbond]);

  const previewData: TransactionPreviewData = useMemo(() => ({
    type: mode,
    nodeAddress,
    amount: mode === 'BOND' ? bondProviderAddress || '0' : amountToUnbond,
    memo,
    estimatedFee: '0.02',
    walletType: walletType || 'keplr',
  }), [mode, nodeAddress, bondProviderAddress, amountToUnbond, memo, walletType]);

  const unbondValidation = useMemo(() => {
    if (mode === 'UNBOND' && selectedPosition) {
      return canUnbondNode(selectedPosition);
    }
    return { canUnbond: true };
  }, [mode, selectedPosition]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSignAndBroadcast = async () => {
    if (!address || !walletType) return;

    setIsSubmitting(true);
    setTxResult(null);

    try {
      const params = {
        type: mode,
        nodeAddress,
        amount: mode === 'BOND' ? bondProviderAddress || '0' : amountToUnbond,
        memo,
        walletType,
      };

      const result = mode === 'BOND'
        ? await executeBondTransaction(params, address)
        : await executeUnbondTransaction(params, address);

      setTxResult(result);
      if (result.success) {
        setShowPreview(false);
      }
    } catch (err) {
      setTxResult({
        success: false,
        error: err instanceof Error ? err.message : 'Transaction failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!isConnected || isNetworkMismatch) return false;
    if (mode === 'BOND') {
      const validation = validateBondAmount(bondProviderAddress || '0');
      return validation.valid;
    }
    if (mode === 'UNBOND') {
      if (!unbondValidation.canUnbond) return false;
      return true;
    }
    return false;
  }, [isConnected, isNetworkMismatch, mode, bondProviderAddress, unbondValidation]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('BOND')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            mode === 'BOND'
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          BOND
        </button>
        <button
          onClick={() => setMode('UNBOND')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            mode === 'UNBOND'
              ? 'bg-amber-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          UNBOND
        </button>
      </div>

      {txResult && (
        <div className={`p-4 rounded-lg border ${
          txResult.success 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {txResult.success ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <p className={txResult.success 
              ? 'text-emerald-700 dark:text-emerald-300' 
              : 'text-red-700 dark:text-red-300'
            }>
              {txResult.success 
                ? `Transaction submitted! Hash: ${txResult.txHash?.slice(0, 16)}...`
                : txResult.error
              }
            </p>
          </div>
          <button
            onClick={() => setTxResult(null)}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Node Address
          </label>
          <input
            type="text"
            value={nodeAddress}
            onChange={(e) => setNodeAddress(e.target.value)}
            placeholder="thor1..."
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {mode === 'BOND' && (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Amount (RUNE)
              </label>
              <input
                type="text"
                value={bondProviderAddress}
                onChange={(e) => setBondProviderAddress(e.target.value)}
                placeholder="Amount to bond"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                <strong>Minimum:</strong> 1.02 RUNE required for bonding
              </p>
            </div>
          </>
        )}

        {mode === 'UNBOND' && (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Amount to Unbond
              </label>
              <input
                type="text"
                value={amountToUnbond}
                onChange={(e) => setAmountToUnbond(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!unbondValidation.canUnbond && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Cannot Unbond:</strong> {unbondValidation.reason}
                </p>
              </div>
            )}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Warning:</strong> Unbonding only works when the node is not Active. 
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Generated Memo
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-zinc-100 break-all">
            {memo}
          </code>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={handleCopy}
          className="flex-1"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Memo
        </Button>
        {isConnected ? (
          <Button
            onClick={() => setShowPreview(true)}
            disabled={!canSubmit}
            className="flex-1"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Sign & Broadcast
          </Button>
        ) : (
          <Button disabled className="flex-1">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>

      {isNetworkMismatch && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Network mismatch detected. Please switch to the correct network in your wallet.
          </p>
        </div>
      )}

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">How to Send</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• <strong>Network:</strong> THORChain (native RUNE)</li>
          <li>• <strong>Gas Fee:</strong> 0.02 RUNE</li>
          <li>• <strong>Memo:</strong> Include the memo above in your transaction</li>
        </ul>
      </div>

      {showPreview && (
        <TransactionPreview
          data={previewData}
          onConfirm={handleSignAndBroadcast}
          onCancel={() => setShowPreview(false)}
          isLoading={isSubmitting}
          error={txResult?.error}
          position={selectedPosition}
        />
      )}
    </div>
  );
}
