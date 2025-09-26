import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/orcs/',
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
});
