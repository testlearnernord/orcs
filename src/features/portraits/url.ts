import { BASE_URL } from './config';

function normalizeBase(base: string): string {
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function resolveWithBase(path: string): string {
  const base = normalizeBase(BASE_URL);
  const cleanedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${cleanedPath}`;
}
