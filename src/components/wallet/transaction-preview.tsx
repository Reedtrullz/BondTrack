'use client';

import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusDialog } from '@/components/ui/focus-dialog';
import type { BondPosition } from '@/lib/types/node';

export interface TransactionPreviewData {
  type: 'BOND' | 'UNBOND';
  nodeAddress: string;
  amount: string;
  memo: string;
  feeNote: string;
  walletType: 'keplr' | 'xdefi' | 'vultisig';
}

interface TransactionPreviewProps {
  data: TransactionPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
  confirmDisabled?: boolean;
  confirmDisabledReason?: string;
  position?: BondPosition;
}

export function TransactionPreview({
  data,
  onConfirm,
  onCancel,
  isLoading,
  error,
  confirmDisabled = false,
  confirmDisabledReason,
  position,
}: TransactionPreviewProps) {
  const isLargeAmount = parseFloat(data.amount) > 2000;
  const titleId = 'transaction-preview-title';

  return (
    <FocusDialog open titleId={titleId} onClose={onCancel}>
      <div className="w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Confirm Transaction
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close transaction preview"
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Type</span>
              <span className={`font-medium ${data.type === 'BOND' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {data.type}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-zinc-500">Target node</span>
              <code className="block rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs leading-relaxed text-zinc-700 break-all dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {data.nodeAddress}
              </code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Requested Amount</span>
              <span className="font-semibold">{data.amount} RUNE</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Network Fee</span>
              <span className="text-right text-xs text-zinc-600 dark:text-zinc-300">{data.feeNote}</span>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <span className="text-xs text-zinc-500 block mb-1">Memo</span>
              <code className="text-xs font-mono break-all text-zinc-700 dark:text-zinc-300">
                {data.memo}
              </code>
            </div>
          </div>

          {isLargeAmount && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Large Transaction
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  This transaction involves a significant amount of RUNE. Please verify all details before confirming.
                </p>
              </div>
            </div>
          )}

          {data.type === 'UNBOND' && position && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> Unbonding is irreversible. The requested amount is encoded in the memo; the wallet transfer amount is not the unbond amount.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {confirmDisabledReason && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{confirmDisabledReason}</p>
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              By confirming, you authorize this THORChain deposit transaction using your{' '}
              {data.walletType === 'keplr' ? 'Keplr' : data.walletType === 'xdefi' ? 'XDEFI' : 'Vultisig'} wallet.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className="flex-1"
            variant={data.type === 'BOND' ? 'default' : 'default'}
          >
            {isLoading ? 'Broadcasting...' : 'Confirm & Broadcast'}
          </Button>
        </div>
      </div>
    </FocusDialog>
  );
}
