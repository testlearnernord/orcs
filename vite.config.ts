import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

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
  plugins: [tsconfigPaths()],
  build: { outDir: 'docs', emptyOutDir: true }
});
