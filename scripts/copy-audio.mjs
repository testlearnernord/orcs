#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const localAudioDir = 'local-audio';
const rootAudioDir = 'audio';
const srcAudioDir = 'src/assets/audio';
const targetDir = 'docs/audio';
const publicTargetDir = 'public/audio';

async function checkAndCopy(sourceDir, sourceName) {
  try {
    await access(sourceDir, constants.R_OK);

    // Copy to docs for production build
    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, force: true });

    // Copy to public for development server
    await mkdir(publicTargetDir, { recursive: true });
    await cp(sourceDir, publicTargetDir, { recursive: true, force: true });

    console.log(`Copied ${sourceName} audio files to docs/ and public/.`);
    return true;
  } catch (error) {
    return false;
  }
}

// Try local-audio first (for local dev override)
let copied = await checkAndCopy(localAudioDir, 'local');

// If no local-audio, try root audio directory (where the real files are)
if (!copied) {
  copied = await checkAndCopy(rootAudioDir, 'root');
}

// If no root audio, try src/assets (the placeholder location)
if (!copied) {
  copied = await checkAndCopy(srcAudioDir, 'src/assets');
}

if (!copied) {
  console.log('No audio files found to copy (skip).');
}
