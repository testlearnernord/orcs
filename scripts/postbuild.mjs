import { existsSync, readdirSync, writeFileSync } from 'node:fs';

const assetsDir = new URL('../docs/assets/', import.meta.url);

if (!existsSync(assetsDir)) {
  console.log('Keine assets/-Mappe gefunden – verwende vorhandenes Bundle.');
} else {
  const files = readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^index-.*\.js$/i.test(name));

  if (files.length === 0) {
    throw new Error(
      'Kein Vite-Bundle gefunden (docs/assets/index-*.js fehlt).'
    );
  }

  files.sort();
  const entryFile = files[files.length - 1];
  const stubPath = new URL('../docs/index.js', import.meta.url);
  const banner =
    '// Auto-generiert: Stabiler Einstiegspunkt für GitHub Pages.\n';
  const content = `${banner}import "./assets/${entryFile}";\n`;
  writeFileSync(stubPath, content, 'utf8');
  console.log(`Schreibe docs/index.js -> assets/${entryFile}`);
}
