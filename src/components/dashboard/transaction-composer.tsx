'use client';

import { AlertTriangle, Check, Copy, ExternalLink, Info, X } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { useWalletContext } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { TransactionPreview, type TransactionPreviewData } from '@/components/wallet/transaction-preview';
import type { TransactionSourceSafety } from '@/lib/dashboard/transaction-preflight';
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
import { cn } from '@/lib/utils';

type Mode = 'BOND' | 'UNBOND';
type CopyAction = 'inline' | 'button';
type CopyStatus = 'idle' | 'success' | 'error';

interface CopyFeedbackState {
  action: CopyAction | null;
  status: CopyStatus;
  message: string;
}

interface PreviewSnapshot {
  amount: string;
  memo: string;
  mode: Mode;
  nodeAddress: string;
  walletAddress: string | null;
  walletType: TransactionPreviewData['walletType'] | null;
}

const COPY_FEEDBACK_DURATION_MS = 4000;
const DEFAULT_COPY_FEEDBACK: CopyFeedbackState = {
  action: null,
  status: 'idle',
  message: '',
};
const WRONG_NETWORK_MESSAGE = 'Wallet is connected to the wrong network. Switch to THORChain mainnet before preview or broadcast.';
const CONNECT_WALLET_MESSAGE = 'Connect a wallet for preview and broadcast. Memo copy stays local for manual wallet review.';
const WALLET_CHANGED_MESSAGE = 'Connected wallet changed after preview opened. Close and review the transaction with the current wallet before broadcasting.';
const WALLET_REQUIRED_LABEL = 'Wallet required';
const STALE_PREVIEW_MESSAGE = 'Transaction details changed after preview opened. Review the form again before broadcasting.';
const DEFAULT_SOURCE_SAFETY: TransactionSourceSafety = {
  canCopyBondMemo: false,
  canCopyUnbondMemo: false,
  canPreview: false,
  detail: 'Transaction source check was not provided. Reload the transactions page before copying, previewing, or broadcasting.',
  itemSeverity: 'warning',
  status: 'Source check required',
  value: 'Awaiting THORNode check',
};

interface TransactionComposerProps {
  positions: BondPosition[];
  address?: string | null;
  action?: 'bond' | 'unbond';
  nodeParam?: string | null;
  amountParam?: string | null;
  onModeChange?: (mode: 'bond' | 'unbond') => void;
  sourceSafety?: TransactionSourceSafety;
}

export function TransactionComposer({
  positions,
  address,
  action,
  nodeParam,
  amountParam,
  onModeChange,
  sourceSafety = DEFAULT_SOURCE_SAFETY,
}: TransactionComposerProps) {
  void address;
  const paramNode = nodeParam ?? null;
  const paramAmount = amountParam ?? null;
  const paramAction = (() => {
    switch (action) {
      case 'bond':
        return 'BOND' as Mode;
      case 'unbond':
        return 'UNBOND' as Mode;
      default:
        return null;
    }
  })();

  const [mode, setMode] = useState<Mode>(() => paramAction ?? 'BOND');
  const [nodeAddress, setNodeAddress] = useState(() => paramNode ?? positions[0]?.nodeAddress ?? '');
  const [bondAmount, setBondAmount] = useState(() => (paramAction === 'BOND' && paramAmount ? paramAmount : ''));
  const [showAdvancedBondFields, setShowAdvancedBondFields] = useState(false);
  const [bondProviderAddress, setBondProviderAddress] = useState('');
  const [nodeOperatorFee, setNodeOperatorFee] = useState('');
  const [amountToUnbond, setAmountToUnbond] = useState(() => (paramAction === 'UNBOND' && paramAmount ? paramAmount : '0'));
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedbackState>(DEFAULT_COPY_FEEDBACK);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<PreviewSnapshot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touchedFields, setTouchedFields] = useState({
    nodeAddress: false,
    bondAmount: false,
    unbondAmount: false,
    bondProviderAddress: false,
    nodeOperatorFee: false,
  });
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const {
    address: walletAddress,
    walletType,
    isConnected,
    isNetworkMismatch,
    error: walletError,
  } = useWalletContext();

  const effectiveNodeAddress = nodeAddress || (!touchedFields.nodeAddress ? positions[0]?.nodeAddress ?? '' : '');

  const selectedPosition = useMemo(() => {
    return positions.find((p) => p.nodeAddress === effectiveNodeAddress);
  }, [positions, effectiveNodeAddress]);

  useEffect(() => {
    if (paramAction) {
      setMode((current) => (current === paramAction ? current : paramAction));
    }
    if (paramNode) {
      setNodeAddress((current) => (current === paramNode ? current : paramNode));
    }
    if (paramAmount) {
      if (paramAction === 'BOND') {
        setBondAmount((current) => (current === paramAmount ? current : paramAmount));
      } else if (paramAction === 'UNBOND') {
        setAmountToUnbond((current) => (current === paramAmount ? current : paramAmount));
      }
    }
  }, [paramAction, paramNode, paramAmount]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const nodeValidation = useMemo(() => {
    if (!effectiveNodeAddress.trim()) return { valid: false, error: 'Node address is required' };
    return validateThorAddress(effectiveNodeAddress, 'Node address');
  }, [effectiveNodeAddress]);

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
        effectiveNodeAddress,
        showAdvancedBondFields ? bondProviderAddress : undefined,
        showAdvancedBondFields ? nodeOperatorFee : undefined
      );
    }
    return generateUnbondMemo(effectiveNodeAddress, amountToUnbond);
  }, [mode, effectiveNodeAddress, showAdvancedBondFields, bondProviderAddress, nodeOperatorFee, amountToUnbond]);

  const transactionAmount = mode === 'BOND' ? bondAmount || '0' : amountToUnbond;

  const previewData: TransactionPreviewData = useMemo(() => ({
    type: mode,
    nodeAddress: effectiveNodeAddress,
    amount: transactionAmount,
    memo,
    feeNote: 'Presented by wallet/network before approval',
    walletAddress,
    walletType,
  }), [mode, effectiveNodeAddress, transactionAmount, memo, walletAddress, walletType]);

  const currentPreviewSnapshot: PreviewSnapshot = useMemo(() => ({
    amount: transactionAmount,
    memo,
    mode,
    nodeAddress: effectiveNodeAddress,
    walletAddress,
    walletType,
  }), [transactionAmount, memo, mode, effectiveNodeAddress, walletAddress, walletType]);

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

    const copyIsAllowed = mode === 'BOND'
      ? sourceSafety.canCopyBondMemo && nodeValidation.valid && providerValidation.valid
      : sourceSafety.canCopyUnbondMemo
        && nodeValidation.valid
        && Boolean(selectedPosition)
        && unbondValidation.canUnbond
        && unbondAmountValidation.valid;

    if (!copyIsAllowed) {
      return;
    }

    try {
      await navigator.clipboard.writeText(memo);
      setCopyFeedback({
        action,
        status: 'success',
        message: 'Memo copied to your clipboard. Paste it into your wallet only after reviewing amount, memo, and fee.',
      });
      scheduleCopyFeedbackReset();
    } catch {
      setCopyFeedback({
        action,
        status: 'error',
        message: 'Copy failed. Select the memo above and copy it manually.',
      });
      scheduleCopyFeedbackReset();
    }
  };

  const handleSignAndBroadcast = async () => {
    if (!sourceSafety.canPreview) {
      setTxResult({ success: false, error: sourceSafety.detail });
      return;
    }

    if (isNetworkMismatch) {
      setTxResult({ success: false, error: WRONG_NETWORK_MESSAGE });
      return;
    }

    if (previewBlockerReason) {
      setTxResult({ success: false, error: previewBlockerReason });
      return;
    }

    if (!walletAddress || !walletType || !canSubmit) {
      setTxResult({ success: false, error: STALE_PREVIEW_MESSAGE });
      return;
    }

    setIsSubmitting(true);
    setTxResult(null);
    try {
      const params = {
        type: mode,
        nodeAddress: effectiveNodeAddress,
        amount: transactionAmount,
        memo,
        walletType,
      };
      const result = mode === 'BOND'
        ? await executeBondTransaction(params, walletAddress)
        : await executeUnbondTransaction(params, walletAddress);
      setTxResult(result);
      if (result.success) {
        setShowPreview(false);
        setPreviewSnapshot(null);
      }
    } catch (err) {
      setTxResult({ success: false, error: err instanceof Error ? err.message : 'Transaction failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nodeIsValid = nodeValidation.valid;
  const bondAmountIsValid = bondAmountValidation.valid;
  const providerIsValid = providerValidation.valid;
  const canUnbond = unbondValidation.canUnbond;
  const unbondAmountIsValid = unbondAmountValidation.valid;
  const hasSelectedPosition = Boolean(selectedPosition);
  const sourceAllowsPreview = sourceSafety.canPreview;
  const sourceAllowsBondMemo = sourceSafety.canCopyBondMemo;
  const sourceAllowsUnbondMemo = sourceSafety.canCopyUnbondMemo;
  const walletUnavailableMessage = walletError ?? CONNECT_WALLET_MESSAGE;

  const canSubmit = sourceAllowsPreview && isConnected && !isNetworkMismatch && nodeIsValid && (
    mode === 'BOND'
      ? bondAmountIsValid && providerIsValid
      : hasSelectedPosition && canUnbond && unbondAmountIsValid
  );
  const previewWalletChanged = Boolean(showPreview && previewSnapshot && (
    previewSnapshot.walletAddress !== currentPreviewSnapshot.walletAddress
    || previewSnapshot.walletType !== currentPreviewSnapshot.walletType
  ));
  const previewDetailsChanged = Boolean(showPreview && previewSnapshot && (
    previewSnapshot.amount !== currentPreviewSnapshot.amount
    || previewSnapshot.memo !== currentPreviewSnapshot.memo
    || previewSnapshot.mode !== currentPreviewSnapshot.mode
    || previewSnapshot.nodeAddress !== currentPreviewSnapshot.nodeAddress
  ));
  const previewBlockerReason = showPreview
    ? isNetworkMismatch
      ? WRONG_NETWORK_MESSAGE
      : !sourceAllowsPreview
        ? sourceSafety.detail
        : !isConnected || !walletAddress || !walletType
          ? walletUnavailableMessage
          : previewWalletChanged
            ? WALLET_CHANGED_MESSAGE
            : previewDetailsChanged || !canSubmit
              ? STALE_PREVIEW_MESSAGE
              : undefined
    : undefined;

  const shouldShowNodeError = submitAttempted || touchedFields.nodeAddress;
  const shouldShowBondAmountError = submitAttempted || touchedFields.bondAmount;
  const shouldShowUnbondAmountError = submitAttempted || touchedFields.unbondAmount;
  const shouldShowProviderError = submitAttempted || touchedFields.bondProviderAddress || touchedFields.nodeOperatorFee;
  const shouldShowValidationMessage = submitAttempted || Object.values(touchedFields).some(Boolean);
  const actionGuidanceMessage = isNetworkMismatch
    ? WRONG_NETWORK_MESSAGE
    : !sourceAllowsPreview
      ? sourceSafety.detail
      : !isConnected
      ? walletUnavailableMessage
      : undefined;
  const actionGuidanceId = actionGuidanceMessage ? 'transaction-action-guidance' : undefined;
  const ActionGuidanceIcon = isNetworkMismatch || !sourceAllowsPreview ? AlertTriangle : Info;

  const validationMessage = useMemo(() => {
    if (!nodeValidation.valid && shouldShowNodeError) return nodeValidation.error;

    if (mode === 'BOND') {
      if (!bondAmountValidation.valid && shouldShowBondAmountError) return bondAmountValidation.error;
      if (!providerValidation.valid && shouldShowProviderError) return providerValidation.error;
      return undefined;
    }

    if (!selectedPosition) {
      return submitAttempted || shouldShowNodeError || shouldShowUnbondAmountError
        ? 'Select one of your bonded nodes before unbonding.'
        : undefined;
    }

    if (!unbondValidation.canUnbond && (submitAttempted || shouldShowNodeError || shouldShowUnbondAmountError)) {
      return unbondValidation.reason;
    }

    if (!unbondAmountValidation.valid && shouldShowUnbondAmountError) return unbondAmountValidation.error;
    return undefined;
  }, [
    nodeValidation,
    shouldShowNodeError,
    mode,
    bondAmountValidation,
    shouldShowBondAmountError,
    providerValidation,
    shouldShowProviderError,
    selectedPosition,
    submitAttempted,
    shouldShowUnbondAmountError,
    unbondValidation,
    unbondAmountValidation,
  ]);

  const nodeError = shouldShowNodeError && !nodeValidation.valid ? nodeValidation.error : undefined;
  const bondAmountError = mode === 'BOND' && shouldShowBondAmountError && !bondAmountValidation.valid ? bondAmountValidation.error : undefined;
  const unbondAmountError = mode === 'UNBOND' && shouldShowUnbondAmountError && !unbondAmountValidation.valid ? unbondAmountValidation.error : undefined;
  const providerError = mode === 'BOND' && showAdvancedBondFields && shouldShowProviderError && !providerValidation.valid ? providerValidation.error : undefined;
  const advancedPanelId = 'transaction-advanced-bond-fields';
  const canCopyMemo = useMemo(() => {
    if (!nodeValidation.valid) return false;
    if (mode === 'BOND') return sourceAllowsBondMemo && providerValidation.valid;
    if (!sourceAllowsUnbondMemo) return false;
    return Boolean(selectedPosition) && unbondValidation.canUnbond && unbondAmountValidation.valid;
  }, [
    nodeValidation,
    mode,
    providerValidation,
    selectedPosition,
    sourceAllowsBondMemo,
    sourceAllowsUnbondMemo,
    unbondValidation,
    unbondAmountValidation,
  ]);
  const memoReadout = canCopyMemo
    ? memo
    : mode === 'BOND'
      ? !nodeValidation.valid
        ? 'Enter a valid node address before copying a BOND memo.'
        : !sourceAllowsBondMemo
          ? 'THORNode source check must pass before copying a BOND memo.'
          : 'Fix advanced BOND memo fields before copying.'
      : !sourceAllowsUnbondMemo
        ? 'THORNode source check must pass before copying an UNBOND memo.'
      : 'Select an eligible standby node and valid amount before copying an UNBOND memo.';
  const memoReadinessDetail = canCopyMemo
    ? mode === 'BOND'
      ? sourceAllowsPreview
        ? 'Memo can be copied for wallet review. Your wallet will present amount and fees before approval/broadcast.'
        : 'Memo can be copied for wallet review. Preview and broadcast still wait for the THORNode source check to pass.'
      : 'UNBOND memo can be copied for wallet review; amount is encoded in 1e8 base units.'
    : mode === 'BOND'
      ? !sourceAllowsBondMemo
        ? 'BOND copy stays disabled until the THORNode source check passes.'
        : 'Copy stays disabled until the node address and advanced memo fields are valid.'
      : !sourceAllowsUnbondMemo
        ? 'UNBOND copy stays disabled until THORNode can prove standby eligibility.'
      : 'Copy stays disabled until an eligible standby node and valid unbond amount are selected.';

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
    setPreviewSnapshot(null);
    setSubmitAttempted(false);
    onModeChange?.(normalizedMode);
  };

  const markTouched = (field: keyof typeof touchedFields) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const handleOpenPreview = () => {
    setSubmitAttempted(true);
    if (canSubmit) {
      setPreviewSnapshot(currentPreviewSnapshot);
      setShowPreview(true);
    }
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
              mode === 'BOND' ? 'bg-sky-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100')}
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

      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-5 hover:shadow-md hover:shadow-sky-500/10 transition-all">
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          {mode === 'BOND' ? (
            <>
              Bond payload minimum: <span className="font-mono text-zinc-700 dark:text-zinc-200">1 RUNE</span>
              <span className="block mt-1">Network fees are dynamic and shown by the wallet before approval/broadcast.</span>
            </>
          ) : (
            <>
              UNBOND uses a zero-RUNE deposit payload.
              <span className="block mt-1">The requested amount is encoded in the memo in 1e8 base units; the wallet presents any network fee before approval/broadcast.</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label htmlFor="transaction-node-address" className="block text-xs font-bold text-zinc-500 uppercase">Node Address</label>
            <input id="transaction-node-address" type="text" placeholder="thor1..." value={effectiveNodeAddress} onChange={(e) => { markTouched('nodeAddress'); setNodeAddress(e.target.value); }} onBlur={() => markTouched('nodeAddress')} aria-invalid={Boolean(nodeError)} aria-describedby={nodeError ? 'transaction-node-address-error' : undefined} className={cn('w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100', nodeError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700')} />
            {nodeError && <p id="transaction-node-address-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{nodeError}</p>}
          </div>
          {mode === 'BOND' ? (
            <div className="space-y-1">
              <label htmlFor="transaction-bond-amount" className="block text-xs font-bold text-zinc-500 uppercase">Bond Amount</label>
              <input id="transaction-bond-amount" type="text" inputMode="decimal" placeholder="0" value={bondAmount} onChange={(e) => { markTouched('bondAmount'); setBondAmount(e.target.value); }} onBlur={() => markTouched('bondAmount')} aria-invalid={Boolean(bondAmountError)} aria-describedby={bondAmountError ? 'transaction-bond-amount-error' : undefined} className={cn('w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100', bondAmountError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700')} />
              {bondAmountError && <p id="transaction-bond-amount-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{bondAmountError}</p>}
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="transaction-unbond-amount" className="block text-xs font-bold text-zinc-500 uppercase">Amount to Unbond</label>
              <input id="transaction-unbond-amount" type="text" inputMode="decimal" placeholder="0" value={amountToUnbond} onChange={(e) => { markTouched('unbondAmount'); setAmountToUnbond(e.target.value); }} onBlur={() => markTouched('unbondAmount')} aria-invalid={Boolean(unbondAmountError)} aria-describedby={unbondAmountError ? 'transaction-unbond-amount-error' : undefined} className={cn('w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100', unbondAmountError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700')} />
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
                  <label htmlFor="transaction-provider-address" className="block text-xs font-bold text-zinc-500 uppercase">Provider Address (optional)</label>
                  <input
                    id="transaction-provider-address"
                    type="text"
                    placeholder="thor1..."
                    value={bondProviderAddress}
                    onChange={(e) => { markTouched('bondProviderAddress'); setBondProviderAddress(e.target.value); }}
                    onBlur={() => markTouched('bondProviderAddress')}
                    aria-invalid={Boolean(providerError)}
                    aria-describedby={providerError ? 'transaction-provider-error' : undefined}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
                      providerError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="transaction-operator-fee" className="block text-xs font-bold text-zinc-500 uppercase">Operator Fee BPS (optional)</label>
                  <input
                    id="transaction-operator-fee"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={nodeOperatorFee}
                    onChange={(e) => { markTouched('nodeOperatorFee'); setNodeOperatorFee(e.target.value); }}
                    onBlur={() => markTouched('nodeOperatorFee')}
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
            <label className="block text-xs font-bold text-zinc-400 uppercase">Generated Memo</label>
          </div>
          <div className="flex items-center gap-2">
            <code
              className={cn(
                'flex-1 font-mono text-sm break-all',
                canCopyMemo ? 'text-zinc-100' : 'text-zinc-400'
              )}
            >
              {memoReadout}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleCopy('inline')}
              disabled={!canCopyMemo}
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
          <p className="mt-2 text-xs text-zinc-400">{memoReadinessDetail}</p>
        </div>

        {validationMessage && shouldShowValidationMessage && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {validationMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant={primaryCopyState === 'success' ? 'success' : primaryCopyState === 'error' ? 'destructive' : 'outline'}
            onClick={() => handleCopy('button')}
            disabled={!canCopyMemo}
            aria-describedby={copyFeedbackId}
            className="flex-1 gap-2"
          >
            <PrimaryCopyIcon className="h-4 w-4" />
            {primaryCopyState === 'success' ? 'Memo copied' : primaryCopyState === 'error' ? 'Copy failed' : 'Copy Memo'}
          </Button>
          {isConnected ? (
            <Button
              onClick={handleOpenPreview}
              disabled={!canSubmit}
              aria-describedby={actionGuidanceId}
              className="flex-1"
            >
              Review Transaction
            </Button>
          ) : (
            <Button disabled aria-describedby={actionGuidanceId} className="flex-1">{WALLET_REQUIRED_LABEL}</Button>
          )}
        </div>
        {actionGuidanceMessage && (
          <div
            id="transaction-action-guidance"
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-sm',
              isNetworkMismatch
                ? 'border-red-200 bg-red-50 text-red-700 shadow-red-500/10 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                : !sourceAllowsPreview
                  ? 'border-amber-200 bg-amber-50 text-amber-800 shadow-amber-500/10 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
                : 'border-sky-200 bg-sky-50 text-sky-700 shadow-sky-500/10 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300'
            )}
          >
            <ActionGuidanceIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{actionGuidanceMessage}</p>
          </div>
        )}
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
      {showPreview && (
        <TransactionPreview
          data={previewData}
          onConfirm={handleSignAndBroadcast}
          onCancel={() => {
            setShowPreview(false);
            setPreviewSnapshot(null);
          }}
          isLoading={isSubmitting}
          error={txResult?.error}
          confirmDisabled={Boolean(previewBlockerReason)}
          confirmDisabledReason={previewBlockerReason}
          position={selectedPosition}
        />
      )}
    </div>
  );
}
