import { defineConfig } from 'vite';

export default defineConfig({
  // Für GitHub Pages unter /orcs/
  base: '/orcs/',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
});
