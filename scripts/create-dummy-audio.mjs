#!/usr/bin/env node
/**
 * Creates dummy/placeholder audio files to prevent 404 errors
 *
 * This script creates minimal valid MP3 files that are essentially silent.
 * These files serve as placeholders until real audio content is added.
 *
 * Usage: node scripts/create-dummy-audio.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';

// Create minimal MP3 header for silent audio files
// This creates valid but very short MP3 files that browsers can recognize
const createMinimalMP3 = () => {
  // Minimal MP3 frame header for 1 second of silence at 44.1kHz, 128kbps
  const mp3Header = Buffer.from([
    0xff,
    0xfb,
    0x90,
    0x00, // MP3 sync word and header
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00, // Padding and frame data
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00
  ]);
  return mp3Header;
};

const audioDir = 'src/assets/audio';

try {
  // Create the audio directory
  await mkdir(audioDir, { recursive: true });

  // Create dummy audio files
  const mp3Data = createMinimalMP3();

  await writeFile(
    `${audioDir}/curse-of-the-witches-jimena-contreras.mp3`,
    mp3Data
  );
  await writeFile(`${audioDir}/whirlpool-the-mini-vandals.mp3`, mp3Data);

  console.log('Created dummy audio files in src/assets/audio/');
  console.log('- curse-of-the-witches-jimena-contreras.mp3');
  console.log('- whirlpool-the-mini-vandals.mp3');
  console.log('');
  console.log(
    'Note: These are minimal placeholder files to prevent 404 errors.'
  );
  console.log(
    'Replace with actual audio files as described in AUDIO_CREDITS.md'
  );
} catch (error) {
  console.error('Failed to create dummy audio files:', error);
  process.exit(1);
}
