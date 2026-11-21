import { defineConfig } from 'vitest/config';
import { TestMetricsReporter } from '../../src/vitest.ts';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: { enabled: true, provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/**/*.spec.ts'], reporter: [] },
    reporters: ['default', new TestMetricsReporter({ limit: 6 })],
  },
});
