// scripts/postbuild.mjs
import { writeFileSync } from 'node:fs';

const redirect =
  '<!doctype html><meta http-equiv="refresh" content="0; url=./docs/">';
writeFileSync('index.html', redirect, 'utf8');

console.log('Root redirect -> ./docs/ geschrieben.');
