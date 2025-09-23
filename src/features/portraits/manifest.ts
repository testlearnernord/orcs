import type { PortraitManifest } from './types';
import { resolveWithBase } from './url';

let cache: PortraitManifest | null = null;

export async function loadPortraitManifest(): Promise<PortraitManifest> {
  if (cache) return cache;

  const url = resolveWithBase('assets/orcs/portraits/manifest.json');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error(
      '[PORTRAITS] Manifest fetch failed',
      url,
      res.status,
      res.statusText
    );
    throw new Error('Failed to load portrait manifest');
  }
  const data = (await res.json()) as PortraitManifest;
  if (!Array.isArray(data.sets) || data.sets.length === 0)
    throw new Error('Invalid manifest: no sets');

  cache = {
    version: data.version ?? 1,
    sets: data.sets.map((s) => ({
      ...s,
      weight: s.weight ?? 1,
      src: resolveWithBase(s.src)
    }))
  };
  return cache;
}
