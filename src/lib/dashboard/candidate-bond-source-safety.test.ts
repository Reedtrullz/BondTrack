import { describe, expect, it } from 'vitest';
import { getCandidateBondSourceSafety } from './candidate-bond-source-safety';
import type { ApiHealthStatus } from '@/lib/hooks/use-api-health';

describe('getCandidateBondSourceSafety', () => {
  it('does not present a healthy THORNode candidate source check as transaction verification', () => {
    const safety = getCandidateBondSourceSafety('healthy');

    expect(safety.canPrepareBond).toBe(true);
    expect(safety.statusLabel).toBe('Source check passed');
    expect(safety.title).toBe('Source check passed');
    expect(safety.value).toBe('THORNode checked');
    expect(safety.value).not.toBe('THORNode available');
    expect(safety.detail).toBe(
      'THORNode node set loaded for candidate scoring and provider-capacity checks. Wallet still presents the final BOND memo and fee for your approval.'
    );
    expect(safety.detail).not.toMatch(/fresh enough|verified|safe/i);
    expect(safety.statusLabel).not.toMatch(/fresh|verified|safe/i);
    expect(safety.title).not.toMatch(/fresh|verified|safe/i);
    expect(safety.value).not.toMatch(/fresh|verified|safe/i);
  });

  it.each(['healthy', 'unknown', 'mock', 'degraded', 'down'] as ApiHealthStatus[])(
    'uses review-first BOND memo language for %s THORNode confidence',
    (status) => {
      const safety = getCandidateBondSourceSafety(status);

      expect(safety.detail).not.toMatch(/prepar(e|ing|ed).*BOND memo/i);
      expect(safety.detail).not.toMatch(/memo prep|fresh enough/i);

      if (status === 'healthy') {
        expect(safety.detail).toContain('Wallet still presents the final BOND memo and fee for your approval');
        expect(safety.detail).not.toContain('Wallet still confirms');
      } else if (status === 'mock') {
        expect(safety.detail).toContain('do not review or copy BOND memos from demo data');
      } else {
        expect(safety.detail).toContain('before reviewing or copying any BOND memo');
      }
    }
  );
});
