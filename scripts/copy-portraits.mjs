#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const localPortraitsDir = 'local-portraits';
const srcPortraitsDir = 'src/assets/orcs/portraits';

// Determine target based on NODE_ENV or if docs exists
const isProduction = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'production';
const targetDir = isProduction ? 'docs/assets/orcs/portraits' : 'public/assets/orcs/portraits';

async function checkAndCopy(sourceDir, sourceName) {
  try {
    await access(sourceDir, constants.R_OK);

    // Copy to single target based on environment
    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, force: true });

    console.log(`Copied ${sourceName} portraits to ${targetDir}.`);
    return true;
  } catch (error) {
    return false;
  }
}

// Try local-portraits first (for local dev override)
let copied = await checkAndCopy(localPortraitsDir, 'local');

// If no local-portraits, try src/assets (the default location)
if (!copied) {
  copied = await checkAndCopy(srcPortraitsDir, 'src/assets');
}

if (!copied) {
  console.log('No portrait files found to copy (skip).');
}
