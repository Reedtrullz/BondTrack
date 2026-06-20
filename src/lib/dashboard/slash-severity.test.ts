import { describe, expect, it } from 'vitest';

import { getSlashSeverity, hasSlashReviewSignal } from './slash-severity';

describe('slash severity', () => {
  it('treats zero slash as no current slash instead of a green OK verdict', () => {
    const severity = getSlashSeverity(0);

    expect(severity).toMatchObject({
      level: 'none',
      label: 'No current slash',
    });
    expect(severity.className).not.toContain('emerald');
    expect(hasSlashReviewSignal(0)).toBe(false);
  });

  it('treats minor nonzero slash as a monitor signal instead of OK', () => {
    const severity = getSlashSeverity(1);

    expect(severity).toMatchObject({
      level: 'monitor',
      label: 'Monitor',
    });
    expect(severity.className).toContain('text-sky-600');
    expect(severity.label).not.toBe('OK');
    expect(hasSlashReviewSignal(1)).toBe(true);
  });
});
