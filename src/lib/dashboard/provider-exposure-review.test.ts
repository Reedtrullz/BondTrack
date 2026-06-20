import { describe, expect, it } from 'vitest';
import type { HealthScoreResult } from '@/lib/utils/health-score';
import { NO_VISIBLE_EXPOSURE_ISSUE_REASON } from '@/lib/utils/health-score';
import { getProviderExposureReviewState } from './provider-exposure-review';

function health(overrides: Partial<HealthScoreResult> = {}): HealthScoreResult {
  return {
    grade: 'A+',
    score: 100,
    reason: NO_VISIBLE_EXPOSURE_ISSUE_REASON,
    isCritical: false,
    breakdown: {
      startingPoints: 100,
      slashPenalty: 0,
      atRiskPenalty: 0,
      jailedPenalty: 0,
      statusPenalty: 0,
      finalScore: 100,
    },
    ...overrides,
  };
}

describe('getProviderExposureReviewState', () => {
  it('labels clean bonded exposure as no urgent review with informational styling', () => {
    const state = getProviderExposureReviewState(health());

    expect(state.label).toBe('No urgent review');
    expect(state.className).toContain('text-sky-600');
    expect(state.className).not.toContain('text-emerald');
  });

  it('keeps no-bond exposure neutral instead of treating it like a clean bonded state', () => {
    const state = getProviderExposureReviewState(health({ reason: 'No positions bonded' }));

    expect(state.label).toBe('No bonded exposure');
    expect(state.className).toContain('text-zinc');
  });

  it('keeps actual provider review reasons attention-toned', () => {
    const state = getProviderExposureReviewState(health({
      grade: 'B',
      reason: 'Churn-risk exposure detected',
      score: 85,
      breakdown: {
        startingPoints: 100,
        slashPenalty: 0,
        atRiskPenalty: 15,
        jailedPenalty: 0,
        statusPenalty: 0,
        finalScore: 85,
      },
    }));

    expect(state.label).toBe('Needs review');
    expect(state.className).toContain('text-amber');
  });
});
