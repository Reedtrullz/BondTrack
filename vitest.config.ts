import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    globals: true,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: process.env.CI ? { junit: 'test-results/vitest/junit.xml' } : undefined,
    passWithNoTests: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['html', 'json', 'json-summary', 'text'],
      include: [
        'src/app/api/**',
        'src/lib/api/**',
        'src/lib/hooks/**',
        'src/lib/transactions/**',
        'src/lib/utils/**',
        'src/components/**/*',
      ],
      exclude: ['**/AGENTS.md', '**/*.md', '**/.DS_Store', '**/*.{test,spec}.{ts,tsx}'],
      thresholds: {
        lines: 20,
        functions: 15,
        branches: 15,
        statements: 20,
        'src/lib/transactions/bond.ts': {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
        'src/lib/api/client.ts': {
          lines: 60,
          functions: 60,
          branches: 50,
          statements: 60,
        },
        'src/app/api/health/route.ts': {
          lines: 80,
          functions: 80,
          branches: 50,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
