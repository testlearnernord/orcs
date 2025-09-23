import { existsSync } from 'node:fs';
const must = [
  'docs/assets/orcs/portraits/manifest.json',
  'docs/assets/orcs/portraits/set_a.webp',
  'docs/assets/orcs/portraits/set_b.webp'
];
const missing = must.filter((p) => !existsSync(p));
if (missing.length) {
  console.error(
    'Missing portrait files in docs/ after build:\n' + missing.join('\n')
  );
  process.exit(1);
}
