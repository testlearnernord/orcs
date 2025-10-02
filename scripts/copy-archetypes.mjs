#!/usr/bin/env node
import { cp, mkdir } from 'node:fs/promises';

const srcArchetypesDir = 'src/assets/archetypes';

// Determine target based on NODE_ENV or if docs exists
const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.BUILD_MODE === 'production';
const targetDir = isProduction
  ? 'docs/assets/archetypes'
  : 'public/assets/archetypes';

async function copyArchetypes() {
  try {
    await mkdir(targetDir, { recursive: true });
    await cp(srcArchetypesDir, targetDir, { recursive: true, force: true });
    console.log(`Copied archetype icons to ${targetDir}.`);
  } catch (error) {
    console.error('Failed to copy archetype icons:', error);
    process.exit(1);
  }
}

await copyArchetypes();
