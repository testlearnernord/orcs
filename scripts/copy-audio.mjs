#!/usr/bin/env node
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const localAudioDir = 'local-audio';
const rootAudioDir = 'audio';
const srcAudioDir = 'src/assets/audio';

// Determine target based on NODE_ENV or if docs exists
const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.BUILD_MODE === 'production';
const targetDir = isProduction ? 'docs/audio' : 'public/audio';

async function checkAndCopy(sourceDir, sourceName) {
  try {
    await access(sourceDir, constants.R_OK);

    // Copy to single target based on environment
    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, force: true });

    console.log(`Copied ${sourceName} audio files to ${targetDir}.`);
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
