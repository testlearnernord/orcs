import { loadPortraitManifest } from './manifest';
import { loadPortraitAtlases } from './portrait-atlas';

export async function preloadPortraitSheets() {
  try {
    const manifest = await loadPortraitManifest();
    await loadPortraitAtlases(manifest.sets.map((set) => set.src));
  } catch (e) {
    console.warn('[PORTRAITS] preload skipped', e);
  }
}
