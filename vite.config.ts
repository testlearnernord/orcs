import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  base: '/orcs/',
  plugins: [react()],
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
