import type { BondPosition, YieldGuardFlag } from '@/lib/types/node';
import type { AlertPreferences, AlertType } from './types';
import { mergeAlertPreferences } from './types';

export interface BondPositionAlertSnapshot {
  nodeAddress: string;
  status: string;
  slashPoints: number;
  isJailed: boolean;
  jailReason?: string;
  yieldGuardFlags?: YieldGuardFlag[];
}

export interface PositionAlertEvent {
  type: AlertType;
  nodeAddress: string;
  message: string;
  fingerprint: string;
}

function shortNodeAddress(nodeAddress: string): string {
  return nodeAddress.length > 16
    ? `${nodeAddress.slice(0, 12)}...${nodeAddress.slice(-4)}`
    : nodeAddress;
}

function hasChurnRisk(position: BondPositionAlertSnapshot): boolean {
  return position.yieldGuardFlags?.includes('lowest_bond') ?? false;
}

function shouldEmit(type: AlertType, preferences: AlertPreferences): boolean {
  switch (type) {
    case 'SLASH_INCREASE':
      return preferences.slashAlerts;
    case 'JAIL':
      return preferences.jailAlerts;
    case 'CHURN_RISK':
      return preferences.churnAlerts;
    case 'NODE_STATUS_CHANGE':
      return preferences.statusAlerts;
  }
}

export function toBondPositionAlertSnapshot(position: BondPosition): BondPositionAlertSnapshot {
  return {
    nodeAddress: position.nodeAddress,
    status: position.status,
    slashPoints: position.slashPoints,
    isJailed: position.isJailed,
    jailReason: position.jailReason,
    yieldGuardFlags: position.yieldGuardFlags,
  };
}

export function buildPositionAlertEvents(
  currentPositions: BondPositionAlertSnapshot[],
  previousPositions: BondPositionAlertSnapshot[],
  rawPreferences?: Partial<AlertPreferences> | null
): PositionAlertEvent[] {
  const preferences = mergeAlertPreferences(rawPreferences);
  const previousByNode = new Map(previousPositions.map((position) => [position.nodeAddress, position]));
  const events: PositionAlertEvent[] = [];

  for (const current of currentPositions) {
    const previous = previousByNode.get(current.nodeAddress);
    if (!previous) continue;

    if (current.slashPoints > previous.slashPoints && shouldEmit('SLASH_INCREASE', preferences)) {
      const delta = current.slashPoints - previous.slashPoints;
      events.push({
        type: 'SLASH_INCREASE',
        nodeAddress: current.nodeAddress,
        message: `Node ${shortNodeAddress(current.nodeAddress)} slash points increased by ${delta} to ${current.slashPoints}. Review provider exposure before changing bond.`,
        fingerprint: `SLASH_INCREASE:${current.nodeAddress}:${current.slashPoints}`,
      });
    }

    if (current.isJailed && !previous.isJailed && shouldEmit('JAIL', preferences)) {
      events.push({
        type: 'JAIL',
        nodeAddress: current.nodeAddress,
        message: `Node ${shortNodeAddress(current.nodeAddress)} entered jail: ${current.jailReason || 'reason unavailable'}. Review slash, jail, and unbond context before acting.`,
        fingerprint: `JAIL:${current.nodeAddress}:${current.jailReason || 'unknown'}`,
      });
    }

    if (current.status !== previous.status && shouldEmit('NODE_STATUS_CHANGE', preferences)) {
      events.push({
        type: 'NODE_STATUS_CHANGE',
        nodeAddress: current.nodeAddress,
        message: `Node ${shortNodeAddress(current.nodeAddress)} status changed from ${previous.status} to ${current.status}. Review source freshness and provider exposure before acting.`,
        fingerprint: `NODE_STATUS_CHANGE:${current.nodeAddress}:${previous.status}:${current.status}`,
      });
    }

    if (hasChurnRisk(current) && !hasChurnRisk(previous) && shouldEmit('CHURN_RISK', preferences)) {
      events.push({
        type: 'CHURN_RISK',
        nodeAddress: current.nodeAddress,
        message: `Node ${shortNodeAddress(current.nodeAddress)} entered the low-bond churn risk set. Review provider exposure before adding or removing bond.`,
        fingerprint: `CHURN_RISK:${current.nodeAddress}:lowest_bond`,
      });
    }
  }

  return events;
}
