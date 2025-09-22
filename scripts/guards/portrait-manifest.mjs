#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(
  root,
  'public',
  'assets',
  'orcs',
  'portraits',
  'manifest.json'
);
const portraitDir = path.dirname(manifestPath);

const errors = [];

function reportError(message) {
  errors.push(message);
}

function rel(p) {
  return path.relative(root, p);
}

async function ensureManifest() {
  let raw;
  try {
    raw = await readFile(manifestPath, 'utf-8');
  } catch (err) {
    reportError(
      `Portrait manifest fehlt oder ist nicht lesbar: ${rel(manifestPath)} (${err.message})`
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    reportError(`Portrait manifest enthält ungültiges JSON: ${err.message}`);
    return;
  }

  if (!Number.isInteger(manifest.version)) {
    reportError('`version` im Portrait manifest muss eine Ganzzahl sein.');
  }

  if (!Array.isArray(manifest.sets) || manifest.sets.length === 0) {
    reportError(
      'Portrait manifest muss mindestens ein Set in `sets` enthalten.'
    );
    return;
  }

  const seenIds = new Set();
  let totalTiles = 0;

  for (const [index, set] of manifest.sets.entries()) {
    if (!set || typeof set !== 'object') {
      reportError(`Eintrag sets[${index}] ist kein Objekt.`);
      continue;
    }

    const prefix = `sets[${index}]`;

    if (typeof set.id !== 'string' || set.id.trim().length === 0) {
      reportError(`${prefix}.id muss ein nicht-leerer String sein.`);
    } else if (seenIds.has(set.id)) {
      reportError(`${prefix}.id "${set.id}" ist doppelt vorhanden.`);
    } else {
      seenIds.add(set.id);
    }

    if (typeof set.src !== 'string' || set.src.trim().length === 0) {
      reportError(`${prefix}.src muss ein nicht-leerer String sein.`);
    } else if (set.src.startsWith('/')) {
      reportError(`${prefix}.src darf nicht mit "/" beginnen.`);
    } else if (!set.src.startsWith('assets/orcs/portraits/')) {
      reportError(`${prefix}.src muss mit "assets/orcs/portraits/" beginnen.`);
    } else if (!set.src.endsWith('.webp')) {
      reportError(`${prefix}.src muss auf ".webp" enden.`);
    } else {
      const fsRelative = path.join('public', set.src);
      const fsPath = path.join(root, fsRelative);
      try {
        await access(fsPath, constants.R_OK);
      } catch {
        reportError(`${prefix}.src verweist auf fehlende Datei: ${fsRelative}`);
      }
    }

    for (const dim of ['cols', 'rows']) {
      if (!Number.isInteger(set[dim]) || set[dim] <= 0) {
        reportError(`${prefix}.${dim} muss eine positive Ganzzahl sein.`);
      }
    }

    for (const dim of ['margin', 'padding']) {
      if (dim in set && (!Number.isInteger(set[dim]) || set[dim] < 0)) {
        reportError(
          `${prefix}.${dim} muss eine nicht-negative Ganzzahl sein, falls angegeben.`
        );
      }
    }

    if ('weight' in set) {
      if (
        typeof set.weight !== 'number' ||
        !Number.isFinite(set.weight) ||
        set.weight <= 0
      ) {
        reportError(
          `${prefix}.weight muss eine positive Zahl sein, falls angegeben.`
        );
      }
    }

    if ('tags' in set) {
      if (
        !Array.isArray(set.tags) ||
        set.tags.some((tag) => typeof tag !== 'string')
      ) {
        reportError(
          `${prefix}.tags muss ein Array aus Strings sein, falls angegeben.`
        );
      }
    }

    if (
      Number.isInteger(set.cols) &&
      set.cols > 0 &&
      Number.isInteger(set.rows) &&
      set.rows > 0
    ) {
      const weight =
        typeof set.weight === 'number' && Number.isFinite(set.weight)
          ? set.weight
          : 1;
      if (weight > 0) {
        totalTiles += set.cols * set.rows * weight;
      }
    }
  }

  if (totalTiles <= 0) {
    reportError(
      'Portrait manifest stellt keine verfügbaren Tiles bereit (prüfe cols/rows/weight).'
    );
  }
}

async function ensureNoLegacyArtifacts() {
  const legacyPaths = [
    'assets/orc',
    'scripts/generate-orcs.ts',
    'scripts/guards/no-legacy-orc-imports.mjs',
    'src/config/art.ts',
    'src/features/portraits/atlas.ts',
    'src/sim/portraits.ts'
  ];

  for (const relPath of legacyPaths) {
    const absPath = path.join(root, relPath);
    try {
      await stat(absPath);
      reportError(`Legacy-Portrait-Artefakt noch vorhanden: ${relPath}`);
    } catch {
      // fehlt -> alles gut
    }
  }
}

async function ensureNoForbiddenAssets() {
  try {
    const entries = await readdir(portraitDir);
    const forbidden = entries.filter((name) => /\.(png|jpe?g)$/i.test(name));
    if (forbidden.length > 0) {
      reportError(
        `Unerlaubte Rasterdateien im Portrait-Ordner gefunden: ${forbidden.join(', ')}`
      );
    }
  } catch (err) {
    reportError(
      `Kann Portrait-Verzeichnis nicht lesen (${rel(portraitDir)}): ${err.message}`
    );
  }
}

await ensureManifest();
await ensureNoLegacyArtifacts();
await ensureNoForbiddenAssets();

if (errors.length > 0) {
  console.error('❌ Portrait-Guard fehlgeschlagen:');
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}

console.log('✅ Portrait-Manifest-Guard erfolgreich.');
