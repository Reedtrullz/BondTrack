'use client';

import { Check, Copy, X } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { useWallet } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { TransactionPreview, type TransactionPreviewData } from '@/components/wallet/transaction-preview';
import {
  executeBondTransaction,
  executeUnbondTransaction,
  validateBondAmount,
  canUnbondNode,
  generateBondMemo,
  generateUnbondMemo,
} from '@/lib/transactions/bond';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type Mode = 'BOND' | 'UNBOND';
type CopyAction = 'inline' | 'button';
type CopyStatus = 'idle' | 'success' | 'error';

interface CopyFeedbackState {
  action: CopyAction | null;
  status: CopyStatus;
  message: string;
}

const COPY_FEEDBACK_DURATION_MS = 4000;
const DEFAULT_COPY_FEEDBACK: CopyFeedbackState = {
  action: null,
  status: 'idle',
  message: '',
};

function validateUnbondAmount(amount: string): { valid: boolean; error?: string } {
  const trimmed = amount.trim();
  if (!trimmed) {
    return { valid: false, error: 'Amount is required' };
  }

  if (!/^(?:\d+\.\d+|\d+)$/.test(trimmed)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  const parsedAmount = parseFloat(trimmed);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  return { valid: true };
}

interface TransactionComposerProps {
  positions: BondPosition[];
  address?: string | null;
}

export function TransactionComposer({ positions, address }: TransactionComposerProps) {
  void address;
  const searchParams = useSearchParams();
  const paramNode = searchParams?.get('node');
  const paramAmount = searchParams?.get('amount');
  const paramAction = (() => {
    switch (searchParams?.get('action')?.toLowerCase()) {
      case 'bond':
        return 'BOND' as Mode;
      case 'unbond':
        return 'UNBOND' as Mode;
      default:
        return null;
    }
  })();

  const [mode, setMode] = useState<Mode>('BOND');
  const [nodeAddress, setNodeAddress] = useState('');
  const [bondProviderAddress, setBondProviderAddress] = useState('');
  const [nodeOperatorFee] = useState('');
  const [amountToUnbond, setAmountToUnbond] = useState('0');
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedbackState>(DEFAULT_COPY_FEEDBACK);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const { address: walletAddress, walletType, isConnected, isNetworkMismatch } = useWallet();

  const selectedPosition = useMemo(() => {
    return positions.find(p => p.nodeAddress === nodeAddress);
  }, [positions, nodeAddress]);

  useEffect(() => {
    if (paramAction) setMode(paramAction);
    if (paramNode) setNodeAddress(paramNode);
    if (paramAmount) {
      if (paramAction === 'BOND') setBondProviderAddress(paramAmount);
      else if (paramAction === 'UNBOND') setAmountToUnbond(paramAmount);
    }
  }, [paramAction, paramNode, paramAmount]);

  useEffect(() => {
    if (positions.length > 0 && !nodeAddress) {
      setNodeAddress(positions[0].nodeAddress);
    }
  }, [positions, nodeAddress]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

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

  const unbondAmountValidation = useMemo(() => validateUnbondAmount(amountToUnbond), [amountToUnbond]);

  const unbondValidation = useMemo(() => {
    if (mode === 'UNBOND' && selectedPosition) {
      return canUnbondNode(selectedPosition);
    }
    return { canUnbond: true };
  }, [mode, selectedPosition]);

  const clearCopyFeedback = () => {
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = null;
    }

    setCopyFeedback(DEFAULT_COPY_FEEDBACK);
  };

  const scheduleCopyFeedbackReset = () => {
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(DEFAULT_COPY_FEEDBACK);
      copyFeedbackTimeoutRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  };

  const handleCopy = async (action: CopyAction) => {
    clearCopyFeedback();

    try {
      await navigator.clipboard.writeText(memo);
      setCopyFeedback({
        action,
        status: 'success',
        message: 'Memo copied to your clipboard. Paste it into your wallet when you are ready.',
      });
      scheduleCopyFeedbackReset();
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyFeedback({
        action,
        status: 'error',
        message: 'Copy failed. Select the memo above and copy it manually.',
      });
      scheduleCopyFeedbackReset();
    }
  };

  const handleSignAndBroadcast = async () => {
    if (!walletAddress || !walletType) return;
    setIsSubmitting(true);
    setTxResult(null);
    try {
      const params = { type: mode, nodeAddress, amount: mode === 'BOND' ? bondProviderAddress || '0' : amountToUnbond, memo, walletType };
      const result = mode === 'BOND' ? await executeBondTransaction(params, walletAddress) : await executeUnbondTransaction(params, walletAddress);
      setTxResult(result);
      if (result.success) setShowPreview(false);
    } catch (err) {
      setTxResult({ success: false, error: err instanceof Error ? err.message : 'Transaction failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!isConnected || isNetworkMismatch) return false;
    if (mode === 'BOND') return validateBondAmount(bondProviderAddress || '0').valid;
    if (mode === 'UNBOND') return Boolean(selectedPosition) && unbondValidation.canUnbond && unbondAmountValidation.valid;
    return false;
  }, [isConnected, isNetworkMismatch, mode, bondProviderAddress, selectedPosition, unbondValidation, unbondAmountValidation]);

  const inlineCopyState = copyFeedback.action === 'inline' ? copyFeedback.status : 'idle';
  const primaryCopyState = copyFeedback.action === 'button' ? copyFeedback.status : 'idle';
  const CopyStatusIcon = copyFeedback.status === 'success' ? Check : X;
  const InlineCopyIcon = inlineCopyState === 'success' ? Check : inlineCopyState === 'error' ? X : Copy;
  const PrimaryCopyIcon = primaryCopyState === 'success' ? Check : primaryCopyState === 'error' ? X : Copy;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setMode('BOND')} className={cn('px-4 py-2 rounded-lg font-medium transition', mode === 'BOND' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>BOND</button>
        <button onClick={() => setMode('UNBOND')} className={cn('px-4 py-2 rounded-lg font-medium transition', mode === 'UNBOND' ? 'bg-amber-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>UNBOND</button>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-5 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Node Address</label>
            <input type="text" value={nodeAddress} onChange={(e) => setNodeAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" />
          </div>
          {mode === 'BOND' ? (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Bond Amount</label>
              <input type="text" value={bondProviderAddress} onChange={(e) => setBondProviderAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Unbond Amount</label>
              <input type="text" value={amountToUnbond} onChange={(e) => setAmountToUnbond(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" />
            </div>
          )}
        </div>
        <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Generated Memo</label>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-zinc-100 break-all">{memo}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleCopy('inline')}
              aria-describedby={copyFeedback.status !== 'idle' ? 'transaction-copy-feedback' : undefined}
              className={cn(
                'shrink-0 gap-2 border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
                inlineCopyState === 'success' && 'border-emerald-500/60 bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white',
                inlineCopyState === 'error' && 'border-red-500/60 bg-red-500 text-white hover:bg-red-600 hover:text-white'
              )}
            >
              <InlineCopyIcon className="h-4 w-4" />
              {inlineCopyState === 'success' ? 'Copied' : inlineCopyState === 'error' ? 'Retry copy' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant={primaryCopyState === 'success' ? 'success' : primaryCopyState === 'error' ? 'destructive' : 'outline'}
            onClick={() => handleCopy('button')}
            aria-describedby={copyFeedback.status !== 'idle' ? 'transaction-copy-feedback' : undefined}
            className="flex-1 gap-2"
          >
            <PrimaryCopyIcon className="h-4 w-4" />
            {primaryCopyState === 'success' ? 'Memo copied' : primaryCopyState === 'error' ? 'Copy failed' : 'Copy Memo'}
          </Button>
          {isConnected ? (
            <Button onClick={() => setShowPreview(true)} disabled={!canSubmit} className="flex-1">Sign & Broadcast</Button>
          ) : (
            <Button disabled className="flex-1">Connect Wallet</Button>
          )}
        </div>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {copyFeedback.message}
        </p>
        {copyFeedback.status !== 'idle' && (
          <div
            id="transaction-copy-feedback"
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
              copyFeedback.status === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
            )}
          >
            <CopyStatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{copyFeedback.message}</span>
          </div>
        )}
      </div>
      {showPreview && <TransactionPreview data={previewData} onConfirm={handleSignAndBroadcast} onCancel={() => setShowPreview(false)} isLoading={isSubmitting} error={txResult?.error} position={selectedPosition} />}
    </div>
  );
}
