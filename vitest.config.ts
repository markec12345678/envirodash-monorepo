import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    env: {
      MONITORS_DIR: resolve(__dirname, 'monitors'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/core/src/**', 'apps/web/src/lib/**', 'apps/web/src/app/api/**'],
      exclude: ['**/__tests__/**', '**/*.test.*'],
    },
  },
  resolve: {
    alias: {
      '@envirodash/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
      '@': new URL('./apps/web/src/', import.meta.url).pathname,
    },
  },
})
