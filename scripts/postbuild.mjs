import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';

const assetsDir = new URL('../docs/assets/', import.meta.url);
const stubPath = new URL('../docs/index.js', import.meta.url);
const htmlPath = new URL('../docs/index.html', import.meta.url);

if (!existsSync(assetsDir)) {
  console.log('Keine assets/-Mappe gefunden – verwende vorhandenes Bundle.');
} else {
  const files = readdirSync(assetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const entryFiles = files.filter((name) => /^index-.*\.js$/i.test(name));
  const cssFiles = files.filter((name) => /^index-.*\.css$/i.test(name));

  if (entryFiles.length === 0) {
    if (existsSync(stubPath)) {
      console.log('Kein Hash-Bundle gefunden, nutze docs/index.js direkt.');
    } else {
      throw new Error(
        'Kein Vite-Bundle gefunden (docs/assets/index-*.js fehlt).'
      );
    }
  } else {
    entryFiles.sort();
    const entryFile = entryFiles[entryFiles.length - 1];
    const banner =
      '// Auto-generiert: Stabiler Einstiegspunkt für GitHub Pages.\n';
    const content = `${banner}import "./assets/${entryFile}";\n`;
    writeFileSync(stubPath, content, 'utf8');
    console.log(`Schreibe docs/index.js -> assets/${entryFile}`);

    if (cssFiles.length > 0) {
      cssFiles.sort();
      const cssFile = cssFiles[cssFiles.length - 1];
      const cssTarget = new URL('./index.css', assetsDir);

      try {
        renameSync(new URL(`./${cssFile}`, assetsDir), cssTarget);
      } catch (error) {
        if (error.code === 'EXDEV' || error.code === 'EACCES') {
          copyFileSync(new URL(`./${cssFile}`, assetsDir), cssTarget);
        } else {
          throw error;
        }
      }
      console.log(`Statisches Stylesheet -> assets/index.css (${cssFile})`);
    }

    if (existsSync(htmlPath)) {
      const html = readFileSync(htmlPath, 'utf8')
        .replace(/src="\.\/assets\/index-[^"]+\.js"/g, 'src="./index.js"')
        .replace(
          /href="\.\/assets\/index-[^"]+\.css"/g,
          'href="./assets/index.css"'
        );
      writeFileSync(htmlPath, html, 'utf8');
      console.log('Aktualisiere docs/index.html für stabile Assets.');
    }
  }
}
