import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardComponentsDir = path.join(process.cwd(), 'src/components/dashboard');

describe('dashboard component inventory', () => {
  it('does not keep retired equal-weight widgets after the triage-first dashboard rebuild', () => {
    const retiredDashboardWidgets = [
      'lp-portfolio-hero.tsx',
      'network-health.tsx',
      'network-status.tsx',
      'pooled-node-details.tsx',
      'reward-projections.tsx',
      'reward-velocity.tsx',
      'risk-exposure-summary.tsx',
      'risk-heatmap.tsx',
    ];

    const stillPresent = retiredDashboardWidgets.filter((fileName) =>
      existsSync(path.join(dashboardComponentsDir, fileName))
    );

    expect(stillPresent).toEqual([]);
  });
});
