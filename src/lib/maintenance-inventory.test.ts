import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('library maintenance inventory', () => {
  it('does not keep retired helper wrappers next to the active data paths', () => {
    const retiredFiles = [
      'src/lib/hooks/use-coinapi-price.ts',
      'src/lib/utils/export.ts',
      'src/lib/utils/pool.ts',
    ];

    const stillPresent = retiredFiles.filter((filePath) =>
      existsSync(path.join(process.cwd(), filePath))
    );

    expect(stillPresent).toEqual([]);
  });
});
