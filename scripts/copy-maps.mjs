#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const srcMapsDir = 'src/assets/maps';

// Determine target based on NODE_ENV or if docs exists
const isProduction = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'production';
const targetDir = isProduction ? 'docs/assets/maps' : 'public/assets/maps';

async function copyMaps() {
  try {
    await access(srcMapsDir, constants.R_OK);

    // Copy to single target based on environment
    await mkdir(targetDir, { recursive: true });
    await cp(srcMapsDir, targetDir, { recursive: true, force: true });

    console.log(`Copied map assets to ${targetDir}.`);
    return true;
  } catch (error) {
    console.error('Failed to copy map assets:', error.message);
    return false;
  }
}

const success = await copyMaps();
if (!success) {
  process.exit(1);
}
