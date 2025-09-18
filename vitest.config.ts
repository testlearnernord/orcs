import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: { reporter: ['text', 'html'], enabled: false }
  },
  resolve: {
    alias: {
      '@sim': resolve(__dirname, './src/sim'),
      '@ui': resolve(__dirname, './src/ui'),
      '@state': resolve(__dirname, './src/state'),
      '@assets': resolve(__dirname, './src/assets')
    }
  }
});
