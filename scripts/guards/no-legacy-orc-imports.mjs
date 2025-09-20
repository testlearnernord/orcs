import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../src', import.meta.url).pathname;
const BAD = [
  'assets/orc/generated/orc_catalog.json',
  'assets/orc/parts/',
  '/orc/parts/',
  'orc_catalog.json'
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

const files = walk(ROOT).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
const offenders = [];

for (const file of files) {
  const txt = readFileSync(file, 'utf8');
  if (BAD.some((pattern) => txt.includes(pattern))) {
    offenders.push(file);
  }
}

if (offenders.length) {
  console.error('❌ Forbidden legacy orc imports:\n' + offenders.join('\n'));
  process.exit(1);
} else {
  console.log('✅ No legacy orc imports found.');
}
