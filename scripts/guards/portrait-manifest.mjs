#!/usr/bin/env node
import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const configPath = path.join(root, 'src', 'ui', 'portraits', 'config.ts');
const legacyManifest = path.join(
  root,
  'src',
  'assets',
  'orcs',
  'portraits',
  'manifest.json'
);

const errors = [];

async function ensureConfigExists() {
  try {
    await access(configPath, constants.R_OK);
  } catch {
    errors.push('Portrait config fehlt: src/ui/portraits/config.ts');
    return;
  }

  const source = await readFile(configPath, 'utf-8');
  if (!source.includes('PORTRAIT_URLS')) {
    errors.push('Portrait config exportiert keine PORTRAIT_URLS.');
  }
  if (!source.includes('REMOTE_PORTRAIT_ORIGIN')) {
    errors.push('Portrait config definiert keinen Remote-Fallback.');
  }
}

async function ensureLegacyManifestRemoved() {
  try {
    await stat(legacyManifest);
    errors.push(
      'Legacy-Datei gefunden: src/assets/orcs/portraits/manifest.json'
    );
  } catch {
    // Datei existiert nicht – alles gut
  }
}

await ensureConfigExists();
await ensureLegacyManifestRemoved();

if (errors.length > 0) {
  console.error('❌ Portrait-Guard fehlgeschlagen:');
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}

console.log('✅ Portrait-Konfiguration geprüft.');
