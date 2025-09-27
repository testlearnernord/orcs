import { access } from 'node:fs/promises';

const required = ['docs/assets'];

const missing = [];
for (const entry of required) {
  try {
    await access(entry);
  } catch {
    missing.push(entry);
  }
}

if (missing.length) {
  console.error('Missing build output after build:', missing.join(', '));
  process.exit(1);
}
