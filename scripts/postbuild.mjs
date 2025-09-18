import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = join(here, '..', 'docs');
const htmlPath = join(docsDir, 'index.html');

let html = readFileSync(htmlPath, 'utf8');

function promoteAsset(
  htmlContent,
  pattern,
  replacement,
  sourceFile,
  targetFile
) {
  if (!sourceFile) return htmlContent;
  const sourcePath = join(docsDir, 'assets', sourceFile);
  const targetPath = join(docsDir, targetFile);
  copyFileSync(sourcePath, targetPath);
  return htmlContent.replace(pattern, replacement);
}

const scriptMatch = html.match(/src="\/orcs\/assets\/([^"']+\.js)"/);
if (!scriptMatch) {
  throw new Error('Bundle script not found in docs/index.html');
}
html = promoteAsset(
  html,
  /src="\/orcs\/assets\/[^"']+\.js"/,
  'src="./index.js"',
  scriptMatch[1],
  'index.js'
);

const cssMatch = html.match(/href="\/orcs\/assets\/([^"']+\.css)"/);
if (cssMatch) {
  html = promoteAsset(
    html,
    /href="\/orcs\/assets\/[^"']+\.css"/,
    'href="./index.css"',
    cssMatch[1],
    'index.css'
  );
}

writeFileSync(htmlPath, html, 'utf8');
console.log('docs/index.html rewritten to use relative index assets.');
=======
// scripts/postbuild.mjs
import { writeFileSync } from 'node:fs';

const redirect =
  '<!doctype html><meta http-equiv="refresh" content="0; url=./docs/">';
writeFileSync('index.html', redirect, 'utf8');

console.log('Root redirect -> ./docs/ geschrieben.');
