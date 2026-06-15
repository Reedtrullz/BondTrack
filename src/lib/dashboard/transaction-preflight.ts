import type { NetworkMismatch, WalletType } from '@/lib/hooks/use-wallet';
import type { ApiHealthStatus } from '@/lib/hooks/use-api-health';
import type { BondPosition } from '@/lib/types/node';
import { canUnbondNode } from '@/lib/transactions/bond';

export type TransactionAction = 'bond' | 'unbond';
export type TransactionPreflightSeverity = 'ready' | 'info' | 'warning' | 'critical';

export interface TransactionPreflightItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  severity: TransactionPreflightSeverity;
}

export interface TransactionPreflightWalletState {
  address: string | null;
  isConnected: boolean;
  isNetworkMismatch: boolean;
  networkMismatch: NetworkMismatch;
  walletType: WalletType;
}

export interface TransactionPreflightModel {
  action: TransactionAction;
  detail: string;
  eligibleUnbondPositions: BondPosition[];
  items: TransactionPreflightItem[];
  severity: TransactionPreflightSeverity;
  source: TransactionSourceSafety;
  status: string;
}

export interface TransactionSourceInput {
  positionsError: boolean;
  positionsLoading: boolean;
  thornodeStatus: ApiHealthStatus;
}

export interface TransactionSourceSafety {
  canCopyBondMemo: boolean;
  canCopyUnbondMemo: boolean;
  canPreview: boolean;
  detail: string;
  itemSeverity: TransactionPreflightSeverity;
  status: string;
  value: string;
}

export interface BuildTransactionPreflightModelInput {
  actionParam: string | null;
  dashboardAddress: string | null;
  positions: BondPosition[];
  source: TransactionSourceInput;
  wallet: TransactionPreflightWalletState;
}

export function parseTransactionAction(action: string | null): TransactionAction {
  return action?.toLowerCase() === 'unbond' ? 'unbond' : 'bond';
}

export function formatShortAddress(value: string | null | undefined): string {
  if (!value) return 'Not selected';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function getPreflightSeverity({
  action,
  eligibleUnbondCount,
  isConnected,
  isNetworkMismatch,
  source,
}: {
  action: TransactionAction;
  eligibleUnbondCount: number;
  isConnected: boolean;
  isNetworkMismatch: boolean;
  source: TransactionSourceSafety;
}): TransactionPreflightSeverity {
  if (isNetworkMismatch) return 'critical';
  if (!source.canPreview) return source.itemSeverity;
  if (action === 'unbond' && eligibleUnbondCount === 0) return 'warning';
  if (isConnected) return 'ready';
  return 'info';
}

function getPreflightStatus({
  action,
  eligibleUnbondCount,
  isConnected,
  isNetworkMismatch,
  source,
}: {
  action: TransactionAction;
  eligibleUnbondCount: number;
  isConnected: boolean;
  isNetworkMismatch: boolean;
  source: TransactionSourceSafety;
}): string {
  if (isNetworkMismatch) return 'Wrong network';
  if (!source.canPreview) return source.status;
  if (action === 'unbond' && eligibleUnbondCount === 0) return 'No eligible standby node';
  if (isConnected) return 'Ready to preview';
  return 'Prepare memo first';
}

function getPreflightDetail({
  action,
  eligibleUnbondCount,
  isConnected,
  isNetworkMismatch,
  networkMismatch,
  source,
}: {
  action: TransactionAction;
  eligibleUnbondCount: number;
  isConnected: boolean;
  isNetworkMismatch: boolean;
  networkMismatch: NetworkMismatch;
  source: TransactionSourceSafety;
}): string {
  if (isNetworkMismatch) {
    return `Wallet reports ${networkMismatch.actual ?? 'unknown'}; THORChain mainnet expects ${networkMismatch.expected}.`;
  }
  if (!source.canPreview) return source.detail;
  if (action === 'unbond' && eligibleUnbondCount === 0) {
    return 'UNBOND can only proceed from a standby node. Review node status before signing.';
  }
  if (isConnected) {
    return 'Wallet is connected; Heimdall still shows a preview before broadcast.';
  }
  return 'Memo copy can be prepared without a wallet. Connect only when you are ready to preview and broadcast.';
}

export function getTransactionSourceSafety({
  positionsError,
  positionsLoading,
  thornodeStatus,
}: TransactionSourceInput): TransactionSourceSafety {
  if (positionsLoading) {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: 'Waiting for THORNode positions before copying, previewing, or broadcasting a transaction.',
      itemSeverity: 'info',
      status: 'Checking source confidence',
      value: 'THORNode pending',
    };
  }

  if (positionsError) {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: 'THORNode positions failed to load. Do not copy, preview, or broadcast until source confidence is fresh.',
      itemSeverity: 'warning',
      status: 'Eligibility unavailable',
      value: 'THORNode failed',
    };
  }

  if (thornodeStatus === 'degraded' || thornodeStatus === 'down') {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: 'THORNode source confidence is degraded. Do not copy, preview, or broadcast until source confidence is fresh.',
      itemSeverity: 'warning',
      status: 'Source confidence degraded',
      value: `THORNode ${thornodeStatus}`,
    };
  }

  if (thornodeStatus === 'unknown') {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: 'THORNode source confidence has not completed yet. Wait for a fresh source check before copying, preview, or broadcast.',
      itemSeverity: 'info',
      status: 'Source confidence pending',
      value: 'THORNode pending',
    };
  }

  return {
    canCopyBondMemo: true,
    canCopyUnbondMemo: true,
    canPreview: true,
    detail: 'THORNode positions are available for node status and unbond eligibility checks.',
    itemSeverity: 'ready',
    status: 'Source verified',
    value: 'THORNode fresh',
  };
}

export function buildTransactionPreflightModel({
  actionParam,
  dashboardAddress,
  positions,
  source: sourceInput,
  wallet,
}: BuildTransactionPreflightModelInput): TransactionPreflightModel {
  const action = parseTransactionAction(actionParam);
  const eligibleUnbondPositions = positions.filter((position) => canUnbondNode(position).canUnbond);
  const eligibleUnbondCount = eligibleUnbondPositions.length;
  const source = getTransactionSourceSafety(sourceInput);
  const severity = getPreflightSeverity({
    action,
    eligibleUnbondCount,
    isConnected: wallet.isConnected,
    isNetworkMismatch: wallet.isNetworkMismatch,
    source,
  });
  const status = getPreflightStatus({
    action,
    eligibleUnbondCount,
    isConnected: wallet.isConnected,
    isNetworkMismatch: wallet.isNetworkMismatch,
    source,
  });
  const detail = getPreflightDetail({
    action,
    eligibleUnbondCount,
    isConnected: wallet.isConnected,
    isNetworkMismatch: wallet.isNetworkMismatch,
    networkMismatch: wallet.networkMismatch,
    source,
  });

  return {
    action,
    detail,
    eligibleUnbondPositions,
    items: [
      {
        id: 'mode',
        label: 'Mode',
        value: action === 'bond' ? 'BOND' : 'UNBOND',
        detail: action === 'bond'
          ? 'Adds RUNE with a THORChain MsgDeposit memo.'
          : 'Uses a zero-RUNE deposit; amount is encoded in memo base units.',
        severity: action === 'bond' ? 'ready' : eligibleUnbondCount > 0 ? 'ready' : 'warning',
      },
      {
        id: 'source',
        label: 'Source confidence',
        value: source.value,
        detail: source.detail,
        severity: source.itemSeverity,
      },
      {
        id: 'wallet',
        label: 'Wallet',
        value: wallet.isNetworkMismatch
          ? 'Network mismatch'
          : wallet.isConnected
            ? formatShortAddress(wallet.address)
            : 'Not connected',
        detail: wallet.isNetworkMismatch
          ? `Switch to ${wallet.networkMismatch.expected} before broadcast.`
          : wallet.isConnected
            ? `${wallet.walletType?.toUpperCase() ?? 'Wallet'} connected for preview.`
            : 'Required for preview and broadcast; memo copy does not require a wallet once source confidence is fresh.',
        severity: wallet.isNetworkMismatch ? 'critical' : wallet.isConnected ? 'ready' : 'info',
      },
      {
        id: 'dashboard-address',
        label: 'Dashboard address',
        value: formatShortAddress(dashboardAddress),
        detail: dashboardAddress
          ? 'Used only for watched positions and history context.'
          : 'No watched address is selected for context.',
        severity: dashboardAddress ? 'ready' : 'warning',
      },
      {
        id: 'eligibility',
        label: action === 'bond' ? 'Node target' : 'UNBOND eligibility',
        value: action === 'bond'
          ? source.canCopyBondMemo
            ? 'Manual node entry'
            : 'Source unavailable'
          : !source.canCopyUnbondMemo
            ? 'Source unavailable'
          : `${eligibleUnbondCount} standby`,
        detail: action === 'bond'
          ? source.canCopyBondMemo
            ? 'Confirm the node address before copying or signing.'
            : 'THORNode must be fresh before Heimdall allows BOND memo copy, preview, or broadcast.'
          : !source.canCopyUnbondMemo
            ? 'THORNode must be fresh before Heimdall can prove standby eligibility.'
          : eligibleUnbondCount > 0
            ? 'Only standby nodes can be selected for UNBOND.'
            : 'No standby node is available from this watched address.',
        severity: action === 'bond'
          ? source.canPreview ? 'ready' : source.itemSeverity
          : !source.canCopyUnbondMemo
            ? source.itemSeverity
            : eligibleUnbondCount > 0 ? 'ready' : 'warning',
      },
    ],
    severity,
    source,
    status,
  };
}
