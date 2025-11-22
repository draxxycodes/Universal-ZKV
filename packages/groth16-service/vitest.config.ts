import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@uzkv/sdk': resolve(__dirname, '../sdk/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Configure pool to support snarkjs worker threads
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.config.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
