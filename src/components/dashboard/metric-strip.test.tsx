import { render, screen } from '@/test/utils';
import { describe, expect, it } from 'vitest';
import { MetricStrip } from './metric-strip';

describe('MetricStrip', () => {
  it('does not single-line clamp warning details in compact mobile mode', () => {
    const detail = 'Local 1000-action cap reached; set a manual baseline before relying on returns';

    render(
      <MetricStrip
        mobileDensity="compact"
        metrics={[
          {
            id: 'reward-history',
            label: 'Reward history',
            value: 'Capped',
            detail,
            severity: 'warning',
          },
        ]}
      />
    );

    expect(screen.getByText(detail)).not.toHaveClass('line-clamp-1');
  });

  it('keeps warning and critical details visible in four-column compact mobile mode', () => {
    const warningDetail = 'Review churn, slash, or leaving signals before adding bond';
    const criticalDetail = 'Jailed node needs operator review before adding exposure';

    render(
      <MetricStrip
        compactMobileColumns={4}
        mobileDensity="compact"
        metrics={[
          {
            id: 'bond-exposure',
            label: 'Bond exposure',
            value: '1 flagged',
            detail: warningDetail,
            severity: 'warning',
          },
          {
            id: 'jail-risk',
            label: 'Jail risk',
            value: '1 urgent',
            detail: criticalDetail,
            severity: 'critical',
          },
        ]}
      />
    );

    expect(screen.getByText(warningDetail)).not.toHaveClass('hidden');
    expect(screen.getByText(criticalDetail)).not.toHaveClass('hidden');
  });

  it('can keep informational evidence visible in four-column compact mobile mode', () => {
    const detail = '1 THORNode LP value row loaded for review';

    render(
      <MetricStrip
        compactDetailMode="all"
        compactMobileColumns={4}
        mobileDensity="compact"
        metrics={[
          {
            id: 'lp-valuation',
            label: 'LP valuation',
            value: 'Source-loaded',
            detail,
            severity: 'info',
          },
        ]}
      />
    );

    expect(screen.getByText(detail)).not.toHaveClass('hidden');
    expect(screen.getByText(detail).parentElement).toHaveClass('col-span-2');
  });

  it('can keep informational evidence unclamped in regular compact mobile mode', () => {
    const detail = '11.15% node-weighted estimate from 2 nodes';

    render(
      <MetricStrip
        compactDetailMode="all"
        mobileDensity="compact"
        metrics={[
          {
            id: 'apy-basis',
            label: 'APY basis',
            value: 'Node-level',
            detail,
            severity: 'info',
          },
        ]}
      />
    );

    expect(screen.getByText(detail)).not.toHaveClass('line-clamp-1');
    expect(screen.getByText(detail)).not.toHaveClass('hidden');
  });
});
