import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';

const buildTime = (() => {
  const date = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${date.getUTCFullYear()}` +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
})();

export default defineConfig({
  base: '/orcs/',
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime)
  },
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
