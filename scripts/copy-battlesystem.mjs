#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const srcBattlesystemDir = 'src/assets/battlesystem';
const targetDir = 'docs/assets/battlesystem';
const publicTargetDir = 'public/assets/battlesystem';

async function checkAndCopy(sourceDir, sourceName) {
  try {
    await access(sourceDir, constants.R_OK);

    // Copy to docs for production build
    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, force: true });

    // Copy to public for development server
    await mkdir(publicTargetDir, { recursive: true });
    await cp(sourceDir, publicTargetDir, { recursive: true, force: true });

    console.log(
      `Copied ${sourceName} battlesystem assets to docs/ and public/.`
    );
    return true;
  } catch (error) {
    console.error(
      `Failed to copy ${sourceName} battlesystem assets:`,
      error.message
    );
    return false;
  }
}

// Copy src/assets battlesystem directory
const copied = await checkAndCopy(srcBattlesystemDir, 'src/assets');

if (!copied) {
  console.log('No battlesystem assets found to copy (skip).');
}
