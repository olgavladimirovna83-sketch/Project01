import path from 'node:path';
import { loadEnv } from 'vite';
import type { TestUserConfig, ViteUserConfig } from 'vitest/config';

/**
 * Общие для `vitest.config.ts` (обычный прогон) и `vitest.live.config.ts`
 * (платные/внешние живые тесты, по явному запросу — см. их же комментарии)
 * настройки — вынесены, чтобы не дублировать resolve/env между двумя
 * конфигами.
 */
export const sharedTestConfig: TestUserConfig = {
  environment: 'node',
  // Явная загрузка .env в process.env для всех тестов (Task 3.2 — найдено,
  // что до этого DATABASE_URL "работал" только случайно, как побочный
  // эффект того, что @prisma/client сам грузит .env при первом импорте;
  // тесты, не трогающие Prisma, без этого не видели свои переменные
  // вообще). loadEnv с пустым префиксом грузит все переменные, не только
  // VITE_*.
  env: loadEnv('', process.cwd(), ''),
};

export const sharedResolve: ViteUserConfig['resolve'] = {
  // Зеркалирует tsconfig.json paths ("@/*": ["./src/*"]) — Vitest не
  // читает tsconfig paths автоматически, только tsc/Next.js.
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
};
