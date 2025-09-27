#!/usr/bin/env node
import { cp, mkdir } from 'node:fs/promises';

const sourceDir = 'local-portraits';
const targetDir = 'docs/assets/orcs/portraits';

try {
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  console.log('Copied local portraits to docs/.');
} catch (error) {
  console.log('No local portraits to copy (skip).');
}
