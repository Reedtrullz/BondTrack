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
  walletAddress: string | null;
  walletType: 'keplr' | 'xdefi' | 'vultisig' | null;
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
  const walletName = data.walletType === 'keplr'
    ? 'Keplr'
    : data.walletType === 'xdefi'
      ? 'XDEFI'
      : data.walletType === 'vultisig'
        ? 'Vultisig'
        : null;
  const isUnbond = data.type === 'UNBOND';
  const walletTransferAmount = isUnbond ? '0' : data.amount;
  const shouldShowWalletAuthorization = Boolean(walletName && !confirmDisabled);

  return (
    <FocusDialog open titleId={titleId} onClose={onCancel}>
      <div className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800 sm:p-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Wallet Broadcast Review
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
          <div className="space-y-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800 sm:p-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Type</span>
              <span className={`font-medium ${data.type === 'BOND' ? 'text-sky-600' : 'text-amber-600'}`}>
                {data.type}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-zinc-500">Connected wallet</span>
              <code className="block rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs leading-relaxed text-zinc-700 break-all dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {data.walletAddress ?? 'Not connected'}
              </code>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-zinc-500">Target node</span>
              <code className="block rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs leading-relaxed text-zinc-700 break-all dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {data.nodeAddress}
              </code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Wallet transfer amount</span>
              <span className="font-semibold">{walletTransferAmount} RUNE</span>
            </div>
            {isUnbond && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-zinc-500">Amount requested in memo</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">{data.amount} RUNE</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Network Fee</span>
              <span className="text-right text-xs text-zinc-600 dark:text-zinc-300">{data.feeNote}</span>
            </div>
            <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <span className="text-xs text-zinc-500 block mb-1">Memo</span>
              <code className="text-xs font-mono break-all text-zinc-700 dark:text-zinc-300">
                {data.memo}
              </code>
            </div>
          </div>

          {isLargeAmount && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Large Transaction
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  This transaction involves a significant amount of RUNE. Recheck the target node, memo, transfer amount, and wallet-presented fee. Approve only if the wallet payload matches this review.
                </p>
              </div>
            </div>
          )}

          {data.type === 'UNBOND' && position && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> Unbonding is irreversible. The wallet transfer amount stays 0 RUNE; the requested unbond amount is encoded in the memo.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {confirmDisabledReason && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{confirmDisabledReason}</p>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {shouldShowWalletAuthorization
                ? `This opens your ${walletName} wallet for final review. Approve in the wallet only if the payload, memo, amount, and network fee match.`
                : 'Open wallet review only after your wallet presents the final THORChain deposit payload and network fee.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800 sm:gap-3 sm:p-4">
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
            {isLoading ? 'Waiting on wallet...' : 'Request Wallet Broadcast'}
          </Button>
        </div>
      </div>
    </FocusDialog>
  );
}
