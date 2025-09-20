import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/orcs/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@sim': resolve(__dirname, 'src/sim'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@state': resolve(__dirname, 'src/state'),
      '@core': resolve(__dirname, 'src/core'),
      '@assets': resolve(__dirname, 'assets')
    }
  },
  build: { outDir: 'docs', emptyOutDir: true }
});
