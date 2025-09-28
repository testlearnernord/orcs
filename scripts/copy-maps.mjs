#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const srcMapsDir = 'src/assets/maps';
const targetDir = 'docs/assets/maps';
const publicTargetDir = 'public/assets/maps';

async function copyMaps() {
  try {
    await access(srcMapsDir, constants.R_OK);

    // Copy to public for development server
    await mkdir(publicTargetDir, { recursive: true });
    await cp(srcMapsDir, publicTargetDir, { recursive: true, force: true });

    // Copy to docs for production build
    await mkdir(targetDir, { recursive: true });
    await cp(srcMapsDir, targetDir, { recursive: true, force: true });

    console.log('Copied map assets to docs/ and public/.');
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
