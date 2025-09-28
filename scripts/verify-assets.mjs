#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const indexPath = 'docs/index.html';

if (!existsSync(indexPath)) {
  console.error('❌ docs/index.html not found. Run build first.');
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');

// Extract asset references from HTML
const assetMatches = [
  ...html.matchAll(/src="([^"]+\.js)"/g),
  ...html.matchAll(/href="([^"]+\.css)"/g)
];

const errors = [];
const checked = [];

for (const match of assetMatches) {
  const assetUrl = match[1];
  // Convert /orcs/assets/... to docs/assets/...
  const localPath = assetUrl.replace(/^\/orcs\//, 'docs/');

  checked.push(assetUrl);

  if (!existsSync(localPath)) {
    errors.push(`Missing asset: ${assetUrl} (expected at ${localPath})`);
  }
}

if (errors.length > 0) {
  console.error('❌ Asset verification failed:');
  errors.forEach((error) => console.error(`  ${error}`));
  process.exit(1);
}

console.log('✅ All assets verified:');
checked.forEach((asset) => console.log(`  ${asset}`));
