import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Зеркалирует tsconfig.json paths ("@/*": ["./src/*"]) — Vitest не
    // читает tsconfig paths автоматически, только tsc/Next.js.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
});
