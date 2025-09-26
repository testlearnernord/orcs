import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: { reporter: ['text', 'html'], enabled: false }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@sim': resolve(__dirname, './src/sim'),
      '@ui': resolve(__dirname, './src/ui'),
      '@state': resolve(__dirname, './src/state'),
      '@core': resolve(__dirname, './src/core')
    }
  }
});
