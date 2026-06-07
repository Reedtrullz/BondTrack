'use client';

import { Check, Copy, ExternalLink, X } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { useWallet } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { TransactionPreview, type TransactionPreviewData } from '@/components/wallet/transaction-preview';
import {
  executeBondTransaction,
  executeUnbondTransaction,
  validateBondAmount,
  validateBondMemoOptions,
  validateUnbondAmount,
  validateThorAddress,
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

interface TransactionComposerProps {
  positions: BondPosition[];
  address?: string | null;
  onModeChange?: (mode: 'bond' | 'unbond') => void;
}

export function TransactionComposer({ positions, address, onModeChange }: TransactionComposerProps) {
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
  const [bondAmount, setBondAmount] = useState('');
  const [showAdvancedBondFields, setShowAdvancedBondFields] = useState(false);
  const [bondProviderAddress, setBondProviderAddress] = useState('');
  const [nodeOperatorFee, setNodeOperatorFee] = useState('');
  const [amountToUnbond, setAmountToUnbond] = useState('0');
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedbackState>(DEFAULT_COPY_FEEDBACK);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const { address: walletAddress, walletType, isConnected, isNetworkMismatch } = useWallet();

  const selectedPosition = useMemo(() => {
    return positions.find((p) => p.nodeAddress === nodeAddress);
  }, [positions, nodeAddress]);

  useEffect(() => {
    if (paramAction) setMode(paramAction);
    if (paramNode) setNodeAddress(paramNode);
    if (paramAmount) {
      if (paramAction === 'BOND') setBondAmount(paramAmount);
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

  const nodeValidation = useMemo(() => {
    if (!nodeAddress.trim()) return { valid: false, error: 'Node address is required' };
    return validateThorAddress(nodeAddress, 'Node address');
  }, [nodeAddress]);

  const providerValidation = useMemo(() => {
    if (!showAdvancedBondFields) return { valid: true };
    return validateBondMemoOptions(bondProviderAddress, nodeOperatorFee);
  }, [showAdvancedBondFields, bondProviderAddress, nodeOperatorFee]);

  const bondAmountValidation = useMemo(() => validateBondAmount(bondAmount || '0'), [bondAmount]);
  const unbondAmountValidation = useMemo(
    () => validateUnbondAmount(amountToUnbond, selectedPosition?.bondAmount),
    [amountToUnbond, selectedPosition]
  );

  const unbondValidation = useMemo(() => {
    if (mode === 'UNBOND' && selectedPosition) {
      return canUnbondNode(selectedPosition);
    }
    return { canUnbond: true };
  }, [mode, selectedPosition]);

  const memo = useMemo(() => {
    if (mode === 'BOND') {
      return generateBondMemo(
        nodeAddress,
        showAdvancedBondFields ? bondProviderAddress : undefined,
        showAdvancedBondFields ? nodeOperatorFee : undefined
      );
    }
    return generateUnbondMemo(nodeAddress, amountToUnbond);
  }, [mode, nodeAddress, showAdvancedBondFields, bondProviderAddress, nodeOperatorFee, amountToUnbond]);

  const previewData: TransactionPreviewData = useMemo(() => ({
    type: mode,
    nodeAddress,
    amount: mode === 'BOND' ? bondAmount || '0' : amountToUnbond,
    memo,
    estimatedFee: '0.02',
    walletType: walletType || 'keplr',
  }), [mode, nodeAddress, bondAmount, amountToUnbond, memo, walletType]);

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
      const params = {
        type: mode,
        nodeAddress,
        amount: mode === 'BOND' ? bondAmount || '0' : amountToUnbond,
        memo,
        walletType,
      };
      const result = mode === 'BOND'
        ? await executeBondTransaction(params, walletAddress)
        : await executeUnbondTransaction(params, walletAddress);
      setTxResult(result);
      if (result.success) setShowPreview(false);
    } catch (err) {
      setTxResult({ success: false, error: err instanceof Error ? err.message : 'Transaction failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!isConnected || isNetworkMismatch || !nodeValidation.valid) return false;
    if (mode === 'BOND') return bondAmountValidation.valid && providerValidation.valid;
    if (mode === 'UNBOND') return Boolean(selectedPosition) && unbondValidation.canUnbond && unbondAmountValidation.valid;
    return false;
  }, [isConnected, isNetworkMismatch, nodeValidation, mode, bondAmountValidation, providerValidation, selectedPosition, unbondValidation, unbondAmountValidation]);

  const validationMessage = useMemo(() => {
    if (!nodeValidation.valid) return nodeValidation.error;
    if (mode === 'BOND') return !bondAmountValidation.valid ? bondAmountValidation.error : !providerValidation.valid ? providerValidation.error : undefined;
    if (!selectedPosition) return 'Select one of your bonded nodes before unbonding.';
    if (!unbondValidation.canUnbond) return unbondValidation.reason;
    if (!unbondAmountValidation.valid) return unbondAmountValidation.error;
    return undefined;
  }, [nodeValidation, mode, bondAmountValidation, providerValidation, selectedPosition, unbondValidation, unbondAmountValidation]);

  const nodeError = nodeValidation.valid ? undefined : nodeValidation.error;
  const bondAmountError = mode === 'BOND' && !bondAmountValidation.valid ? bondAmountValidation.error : undefined;
  const unbondAmountError = mode === 'UNBOND' && !unbondAmountValidation.valid ? unbondAmountValidation.error : undefined;
  const providerError = mode === 'BOND' && showAdvancedBondFields && !providerValidation.valid ? providerValidation.error : undefined;
  const advancedPanelId = 'transaction-advanced-bond-fields';

  const inlineCopyState = copyFeedback.action === 'inline' ? copyFeedback.status : 'idle';
  const primaryCopyState = copyFeedback.action === 'button' ? copyFeedback.status : 'idle';
  const CopyStatusIcon = copyFeedback.status === 'success' ? Check : X;
  const InlineCopyIcon = inlineCopyState === 'success' ? Check : inlineCopyState === 'error' ? X : Copy;
  const PrimaryCopyIcon = primaryCopyState === 'success' ? Check : primaryCopyState === 'error' ? X : Copy;
  const copyFeedbackId = copyFeedback.status !== 'idle' ? 'transaction-copy-feedback' : undefined;

  const handleModeChange = (nextMode: Mode) => {
    const normalizedMode = nextMode.toLowerCase() as 'bond' | 'unbond';

    setMode(nextMode);
    setTxResult(null);
    onModeChange?.(normalizedMode);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
          <button
            type="button"
            onClick={() => handleModeChange('BOND')}
            aria-pressed={mode === 'BOND'}
            className={cn('px-4 py-2 rounded-md font-medium transition text-sm',
              mode === 'BOND' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100')}
          >
            BOND
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('UNBOND')}
            aria-pressed={mode === 'UNBOND'}
            className={cn('px-4 py-2 rounded-md font-medium transition text-sm',
              mode === 'UNBOND' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100')}
          >
            UNBOND
          </button>
        </div>
        <span className="text-xs text-zinc-500">
          {mode === 'BOND' ? 'Add RUNE to a node' : 'Request RUNE withdrawal from a node'}
        </span>
      </div>

      {txResult?.success && txResult.txHash && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Transaction broadcast</p>
              <p className="font-mono text-xs break-all">{txResult.txHash}</p>
            </div>
            <a
              href={`https://runescan.io/tx/${txResult.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
            >
              View on Runescan
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-5 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Minimum bond transaction reserve: <span className="font-mono text-zinc-700 dark:text-zinc-200">1.02 RUNE</span>
          {mode === 'UNBOND' && <span className="block mt-1">Unbond request amounts are encoded in the memo in 1e8 base units.</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label htmlFor="transaction-node-address" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Node Address</label>
            <input id="transaction-node-address" type="text" placeholder="thor1..." value={nodeAddress} onChange={(e) => setNodeAddress(e.target.value)} aria-invalid={Boolean(nodeError)} aria-describedby={nodeError ? 'transaction-node-address-error' : undefined} className={cn('w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100', nodeError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700')} />
            {nodeError && <p id="transaction-node-address-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{nodeError}</p>}
          </div>
          {mode === 'BOND' ? (
            <div className="space-y-1">
              <label htmlFor="transaction-bond-amount" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Bond Amount</label>
              <input id="transaction-bond-amount" type="text" inputMode="decimal" placeholder="0" value={bondAmount} onChange={(e) => setBondAmount(e.target.value)} aria-invalid={Boolean(bondAmountError)} aria-describedby={bondAmountError ? 'transaction-bond-amount-error' : undefined} className={cn('w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100', bondAmountError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700')} />
              {bondAmountError && <p id="transaction-bond-amount-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{bondAmountError}</p>}
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="transaction-unbond-amount" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount to Unbond</label>
              <input id="transaction-unbond-amount" type="text" inputMode="decimal" placeholder="0" value={amountToUnbond} onChange={(e) => setAmountToUnbond(e.target.value)} aria-invalid={Boolean(unbondAmountError)} aria-describedby={unbondAmountError ? 'transaction-unbond-amount-error' : undefined} className={cn('w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100', unbondAmountError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700')} />
              {unbondAmountError && <p id="transaction-unbond-amount-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{unbondAmountError}</p>}
            </div>
          )}
        </div>

        {mode === 'BOND' && (
          <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setShowAdvancedBondFields((value) => !value)}
              className="text-xs font-semibold text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              aria-expanded={showAdvancedBondFields}
              aria-controls={advancedPanelId}
            >
              {showAdvancedBondFields ? 'Hide advanced bond memo fields' : 'Advanced: provider address / operator fee'}
            </button>
            {showAdvancedBondFields && (
              <div id={advancedPanelId} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="transaction-provider-address" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Provider Address (optional)</label>
                  <input
                    id="transaction-provider-address"
                    type="text"
                    placeholder="thor1..."
                    value={bondProviderAddress}
                    onChange={(e) => setBondProviderAddress(e.target.value)}
                    aria-invalid={Boolean(providerError)}
                    aria-describedby={providerError ? 'transaction-provider-error' : undefined}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
                      providerError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="transaction-operator-fee" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Operator Fee BPS (optional)</label>
                  <input
                    id="transaction-operator-fee"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={nodeOperatorFee}
                    onChange={(e) => setNodeOperatorFee(e.target.value)}
                    aria-invalid={Boolean(providerError)}
                    aria-describedby={providerError ? 'transaction-provider-error' : undefined}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
                      providerError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    )}
                  />
                </div>
                {providerError && <p id="transaction-provider-error" role="alert" className="text-xs text-red-600 dark:text-red-400 md:col-span-2">{providerError}</p>}
              </div>
            )}
          </div>
        )}

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
              aria-describedby={copyFeedbackId}
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

        {validationMessage && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {validationMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant={primaryCopyState === 'success' ? 'success' : primaryCopyState === 'error' ? 'destructive' : 'outline'}
            onClick={() => handleCopy('button')}
            aria-describedby={copyFeedbackId}
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
        {copyFeedback.status !== 'idle' && (
          <div
            id="transaction-copy-feedback"
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm transition-all duration-300',
              copyFeedback.status === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 shadow-sm shadow-red-500/10'
            )}
          >
            <CopyStatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{copyFeedback.status === 'success' ? 'Success!' : 'Copy Failed'}</p>
              <p className="text-xs opacity-80 mt-0.5">{copyFeedback.message}</p>
            </div>
          </div>
        )}
      </div>
      {showPreview && <TransactionPreview data={previewData} onConfirm={handleSignAndBroadcast} onCancel={() => setShowPreview(false)} isLoading={isSubmitting} error={txResult?.error} position={selectedPosition} />}
    </div>
  );
}
