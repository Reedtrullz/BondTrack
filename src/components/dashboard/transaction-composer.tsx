'use client';

import { useState, useEffect, useMemo } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { useWallet } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Wallet, Copy, CheckCircle, AlertCircle, Sparkles, Target, MinusCircle } from 'lucide-react';
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

interface TransactionComposerProps {
  positions: BondPosition[];
}

export function TransactionComposer({ positions }: TransactionComposerProps) {
  const searchParams = useSearchParams();
  const address = searchParams.get('address') || '';
  const paramNode = searchParams.get('node');
  const paramAmount = searchParams.get('amount');
  const paramAction = searchParams.get('action') as Mode | null;

  const [mode, setMode] = useState<Mode>('BOND');
  const [nodeAddress, setNodeAddress] = useState('');
  const [bondProviderAddress, setBondProviderAddress] = useState('');
  const [nodeOperatorFee, setNodeOperatorFee] = useState('');
  const [amountToUnbond, setAmountToUnbond] = useState('0');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);

  const { address: walletAddress, walletType, isConnected, isNetworkMismatch } = useWallet();

  const selectedPosition = useMemo(() => {
    return positions.find(p => p.nodeAddress === nodeAddress);
  }, [positions, nodeAddress]);

  useEffect(() => {
    if (paramAction) setMode(paramAction);
    if (paramNode) setNodeAddress(paramNode);
    if (paramAmount) {
      if (paramAction === 'BOND') setBondProviderAddress(paramAmount);
      else setAmountToUnbond(paramAmount);
    }
  }, [paramAction, paramNode, paramAmount]);

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
    if (mode === 'BOND') return validateBondAmount(bondProviderHAddress || '0').valid;
    if (mode === 'UNBOND') return unbondValidation.canUnbond;
    return false;
  }, [isConnected, isNetworkMismatch, mode, bondProviderAddress, unbondValidation]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setMode('BOND')} className={cn("px-4 py-2 rounded-lg font-medium transition", mode === 'BOND' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>BOND</button>
        <button onClick={() => setMode('UNBOND')} className={cn("px-4 py-2 rounded-lg font-medium transition", mode === 'UNBOND' ? 'bg-amber-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>UNBOND</button>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-5">
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
            <button onClick={handleCopy} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-700 text-zinc-200">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleCopy} className="flex-1">Copy Memo</Button>
          {isConnected ? (
            <Button onClick={() => setShowPreview(true)} disabled={!canSubmit} className="flex-1">Sign & Broadcast</Button>
          ) : (
            <Button disabled className="flex-1">Connect Wallet</Button>
          )}
        </div>
      </div>
      {showPreview && <TransactionPreview data={previewData} onConfirm={handleSignAndBroadcast} onCancel={() => setShowPreview(false)} isLoading={isSubmitting} error={txResult?.error} position={selectedPosition} />}
    </div>
  );
}
