import { readFileSync } from 'node:fs';
import { globby } from 'globby';

const files = await globby([
  'src/**/*.{ts,tsx,js,jsx,css,md}',
  '!**/node_modules/**'
]);
const bad = [];
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  if (
    s.match(
      /assets\/orc(?:\/|\b)|src\/assets\/orc(?:\/|\b)|generated\/orc_catalog|getOrcFace/i
    )
  )
    bad.push(f);
}
if (bad.length) {
  console.error('Legacy portrait references found:\n' + bad.join('\n'));
  process.exit(1);
}
