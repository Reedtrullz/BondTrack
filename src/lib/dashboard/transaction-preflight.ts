import type { NetworkMismatch, WalletType } from '@/lib/hooks/use-wallet';
import type { ApiHealthStatus } from '@/lib/hooks/use-api-health';
import type { BondPosition } from '@/lib/types/node';
import { canUnbondNode } from '@/lib/transactions/bond';

export type TransactionAction = 'bond' | 'unbond';
export type TransactionPreflightSeverity = 'checked' | 'info' | 'warning' | 'critical';

export interface TransactionPreflightItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  severity: TransactionPreflightSeverity;
}

export interface TransactionPreflightPrimaryAction {
  href: '#transaction-composer' | '#transaction-source-confidence';
  label: 'Open composer' | 'Review source checks';
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
  primaryAction: TransactionPreflightPrimaryAction;
  severity: TransactionPreflightSeverity;
  source: TransactionSourceSafety;
  status: string;
}

export interface TransactionSourceInput {
  action?: TransactionAction;
  dashboardAddress?: string | null;
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
  if (isConnected) return 'info';
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
  if (isConnected) return 'Review before broadcast';
  return 'Review memo first';
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
    return 'Wallet is connected. Review the memo here, then approve only if the wallet presents payload, memo, amount, and network fee that match.';
  }
  return 'Review and copy the memo without connecting a wallet. Connect only for preview and broadcast.';
}

function getPreflightPrimaryAction(source: TransactionSourceSafety): TransactionPreflightPrimaryAction {
  if (!source.canPreview) {
    return {
      href: '#transaction-source-confidence',
      label: 'Review source checks',
    };
  }

  return {
    href: '#transaction-composer',
    label: 'Open composer',
  };
}

export function getTransactionSourceSafety({
  action,
  dashboardAddress,
  positionsError,
  positionsLoading,
  thornodeStatus,
}: TransactionSourceInput): TransactionSourceSafety {
  const isManualBondWithoutDashboardAddress = action === 'bond' && !dashboardAddress;

  if (positionsLoading) {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: isManualBondWithoutDashboardAddress
        ? 'Waiting for THORNode source checks before copying, previewing, or broadcasting a manual BOND memo.'
        : 'Waiting for THORNode positions before copying, previewing, or broadcasting a transaction.',
      itemSeverity: 'info',
      status: 'Checking source',
      value: 'THORNode pending',
    };
  }

  if (positionsError) {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: isManualBondWithoutDashboardAddress
        ? 'THORNode source checks failed. Do not copy, preview, or broadcast a manual BOND memo until THORNode responds again.'
        : 'THORNode positions failed to load. Do not copy, preview, or broadcast until THORNode positions respond again.',
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
      detail: isManualBondWithoutDashboardAddress
        ? 'THORNode source check is degraded. Do not copy, preview, or broadcast a manual BOND memo until THORNode responds again.'
        : 'THORNode source check is degraded. Do not copy, preview, or broadcast until THORNode positions respond again.',
      itemSeverity: 'warning',
      status: 'Source check degraded',
      value: `THORNode ${thornodeStatus}`,
    };
  }

  if (thornodeStatus === 'unknown') {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: isManualBondWithoutDashboardAddress
        ? 'THORNode source check has not completed yet. Wait for THORNode source checks before copying, previewing, or broadcasting a manual BOND memo.'
        : 'THORNode source check has not completed yet. Wait for current THORNode positions before copying, preview, or broadcast.',
      itemSeverity: 'info',
      status: 'Source check pending',
      value: 'THORNode pending',
    };
  }

  if (thornodeStatus === 'mock') {
    return {
      canCopyBondMemo: false,
      canCopyUnbondMemo: false,
      canPreview: false,
      detail: 'Local mock data is enabled. Do not copy, preview, or broadcast BOND or UNBOND transactions from demo data.',
      itemSeverity: 'warning',
      status: 'Demo data only',
      value: 'THORNode mock',
    };
  }

  return {
    canCopyBondMemo: true,
    canCopyUnbondMemo: true,
    canPreview: true,
    detail: isManualBondWithoutDashboardAddress
      ? 'THORNode source checks are responding for manual BOND memo review. Source availability is not transaction approval; wallet still presents the final payload and fee.'
      : 'THORNode positions responded for node status and unbond eligibility. Source availability is not transaction approval; wallet still presents the final payload and fee.',
    itemSeverity: 'checked',
    status: 'Source responding',
    value: 'THORNode responding',
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
  const isManualBondWithoutDashboardAddress = action === 'bond' && !dashboardAddress;
  const source = getTransactionSourceSafety({
    ...sourceInput,
    action,
    dashboardAddress,
  });
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
        severity: action === 'bond' ? 'info' : eligibleUnbondCount > 0 ? 'checked' : 'warning',
      },
      {
        id: 'source',
        label: 'Source checks',
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
            ? `${wallet.walletType?.toUpperCase() ?? 'Wallet'} connected; wallet must present final payload before approval.`
            : isManualBondWithoutDashboardAddress
              ? 'Required for preview and broadcast; memo copy stays local once THORNode source checks respond.'
              : 'Required for preview and broadcast; memo copy stays local once THORNode positions respond.',
        severity: wallet.isNetworkMismatch ? 'critical' : wallet.isConnected ? 'checked' : 'info',
      },
      {
        id: 'dashboard-address',
        label: 'Dashboard address',
        value: formatShortAddress(dashboardAddress),
        detail: dashboardAddress
          ? 'Used only for watched positions and history context.'
          : 'No watched address is selected for context.',
        severity: dashboardAddress ? 'checked' : 'warning',
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
            : isManualBondWithoutDashboardAddress
              ? 'THORNode source checks must respond before Heimdall allows manual BOND memo copy, preview, or broadcast.'
              : 'Current THORNode positions must respond before Heimdall allows BOND memo copy, preview, or broadcast.'
          : !source.canCopyUnbondMemo
            ? 'THORNode positions must respond before Heimdall can check standby eligibility.'
            : eligibleUnbondCount > 0
              ? 'Only standby nodes can be selected for UNBOND.'
              : 'No standby node is available from this watched address.',
        severity: action === 'bond'
          ? source.canPreview ? 'info' : source.itemSeverity
          : !source.canCopyUnbondMemo
            ? source.itemSeverity
            : eligibleUnbondCount > 0 ? 'checked' : 'warning',
      },
    ],
    primaryAction: getPreflightPrimaryAction(source),
    severity,
    source,
    status,
  };
}
