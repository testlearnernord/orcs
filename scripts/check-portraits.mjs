#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import process from 'node:process';

const atlases = ['set_a.webp', 'set_b.webp'];
const roots = ['dist', 'docs'];

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(path) {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

const checkedRoots = [];

for (const root of roots) {
  if (!(await dirExists(root))) continue;
  const missing = [];
  for (const file of atlases) {
    const target = `${root}/assets/orcs/portraits/${file}`;
    if (!(await pathExists(target))) {
      missing.push(target);
    }
  }
  checkedRoots.push({ root, missing });
}

if (!checkedRoots.length) {
  console.error(
    'No build directories (dist/docs) found. Run `npm run build` first.'
  );
  process.exit(1);
}

const rootsWithMissing = checkedRoots.filter((entry) => entry.missing.length);

if (rootsWithMissing.length === checkedRoots.length) {
  const details = rootsWithMissing
    .map((entry) => `${entry.root}:\n  ${entry.missing.join('\n  ')}`)
    .join('\n');
  console.error('Missing portrait atlases in build output:\n' + details);
  process.exit(1);
}

for (const entry of rootsWithMissing) {
  console.warn(
    `[portraits] atlases missing in ${entry.root}, but present in other build output`,
    entry.missing
  );
}

console.log(
  '✅ Portrait atlases present in build output:',
  checkedRoots
    .filter((entry) => entry.missing.length === 0)
    .map((entry) => entry.root)
    .join(', ')
);
