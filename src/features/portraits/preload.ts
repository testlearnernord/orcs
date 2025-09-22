import { loadPortraitManifest } from './manifest';

const preloaded = new Set<string>();

export async function preloadPortraitSheets(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const manifest = await loadPortraitManifest();
    if (typeof Image === 'undefined') return;
    for (const set of manifest.sets) {
      if (preloaded.has(set.src)) continue;
      preloaded.add(set.src);
      const img = new Image();
      img.decoding = 'async';
      (img as any).loading = 'eager';
      img.src = set.src;
    }
  } catch {
    /* ignore */
  }
}
