import path from 'node:path';
import { loadEnv } from 'vite';
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
    // Явная загрузка .env в process.env для всех тестов (Task 3.2 — найдено,
    // что до этого DATABASE_URL "работал" только случайно, как побочный
    // эффект того, что @prisma/client сам грузит .env при первом импорте;
    // тесты, не трогающие Prisma (например INSTAGRAM_* в live smoke test),
    // без этого не видели свои переменные вообще). loadEnv с пустым префиксом
    // грузит все переменные, не только VITE_*.
    env: loadEnv('', process.cwd(), ''),
  },
});
