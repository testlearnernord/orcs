import { resolveWithBase } from './url';

export async function preloadPortraitSheets() {
  try {
    const manifestUrl = resolveWithBase('assets/orcs/portraits/manifest.json');
    const res = await fetch(manifestUrl, { cache: 'no-store' });
    if (!res.ok) return;
    const { sets } = await res.json();
    for (const s of sets) {
      const img = new Image();
      img.decoding = 'async';
      (img as any).loading = 'eager';
      img.src = resolveWithBase(s.src);
    }
  } catch (e) {
    console.warn('[PORTRAITS] preload skipped', e);
  }
}
