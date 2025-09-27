#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const localPortraitsDir = 'local-portraits';
const srcPortraitsDir = 'src/assets/orcs/portraits';
const targetDir = 'docs/assets/orcs/portraits';
const publicTargetDir = 'public/assets/orcs/portraits';

async function checkAndCopy(sourceDir, sourceName) {
  try {
    await access(sourceDir, constants.R_OK);

    // Copy to docs for production build
    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, force: true });

    // Copy to public for development server
    await mkdir(publicTargetDir, { recursive: true });
    await cp(sourceDir, publicTargetDir, { recursive: true, force: true });

    console.log(`Copied ${sourceName} portraits to docs/ and public/.`);
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
