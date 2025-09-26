#!/usr/bin/env node
import { access } from 'node:fs/promises';

const mustExist = ['docs/assets/'];

const missing = [];
for (const entry of mustExist) {
  try {
    await access(entry);
  } catch {
    missing.push(entry);
  }
}

if (missing.length > 0) {
  console.error('Build assets missing:', missing.join(', '));
  process.exit(1);
}

console.log('✅ Portrait build assets present.');
