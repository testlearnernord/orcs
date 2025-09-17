import { readdirSync, writeFileSync } from 'node:fs';

const assetsDir = new URL('../docs/assets/', import.meta.url);
const files = readdirSync(assetsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /^index-.*\.js$/i.test(name));

if (files.length === 0) {
  throw new Error('Kein Vite-Bundle gefunden (docs/assets/index-*.js fehlt).');
}

// Vite leert docs/ vor dem Build, daher sollte genau eine Datei übrig bleiben.
// Falls mehrere existieren, wähle die zuletzt sortierte, um deterministisch zu sein.
files.sort();
const entryFile = files[files.length - 1];
const stubPath = new URL('../docs/index.js', import.meta.url);
const banner = '// Auto-generiert: Stabiler Einstiegspunkt für GitHub Pages.\n';
const content = `${banner}import "./assets/${entryFile}";\n`;
writeFileSync(stubPath, content, 'utf8');
console.log(`Schreibe docs/index.js -> assets/${entryFile}`);
