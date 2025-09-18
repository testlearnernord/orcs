import { defineConfig } from 'vite';

export default defineConfig({
  base: '/orcs/',
  resolve: {
    alias: {
      '@sim': '/src/sim',
      '@ui': '/src/ui',
      '@state': '/src/state',
      '@assets': '/assets'
    }
  },
  build: { outDir: 'docs', emptyOutDir: true }
});
