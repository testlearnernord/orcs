import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/orcs/',
  plugins: [tsconfigPaths()],
  build: { outDir: 'docs', emptyOutDir: true }
});
