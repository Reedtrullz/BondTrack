import { describe, expect, it } from 'vitest';
import { buildPositionAlertEvents, type BondPositionAlertSnapshot } from './position-alerts';

const nodeAddress = 'thor1nodealertsaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function snapshot(overrides: Partial<BondPositionAlertSnapshot> = {}): BondPositionAlertSnapshot {
  return {
    nodeAddress,
    status: 'Active',
    slashPoints: 4,
    isJailed: false,
    yieldGuardFlags: [],
    ...overrides,
  };
}

describe('buildPositionAlertEvents', () => {
  it('emits provider-facing transition events with stable fingerprints', () => {
    const events = buildPositionAlertEvents(
      [snapshot({
        status: 'Standby',
        slashPoints: 12,
        isJailed: true,
        jailReason: 'missed observation',
        yieldGuardFlags: ['lowest_bond'],
      })],
      [snapshot()]
    );

    expect(events.map((event) => event.type)).toEqual([
      'SLASH_INCREASE',
      'JAIL',
      'NODE_STATUS_CHANGE',
      'CHURN_RISK',
    ]);
    expect(events[0]).toMatchObject({
      fingerprint: `SLASH_INCREASE:${nodeAddress}:12`,
      message: expect.stringContaining('Review provider exposure'),
    });
  });

  it('honors alert preferences before creating background push events', () => {
    const events = buildPositionAlertEvents(
      [snapshot({ slashPoints: 12, yieldGuardFlags: ['lowest_bond'] })],
      [snapshot()],
      {
        slashAlerts: false,
        churnAlerts: true,
      }
    );

    expect(events.map((event) => event.type)).toEqual(['CHURN_RISK']);
  });

  it('does not backfill events when there is no matching previous node snapshot', () => {
    const events = buildPositionAlertEvents(
      [snapshot({ slashPoints: 99 })],
      []
    );

    expect(events).toEqual([]);
  });
});
