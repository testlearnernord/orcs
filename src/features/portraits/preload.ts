import { loadPortraitAtlases } from './portrait-atlas';

export async function preloadPortraitSheets() {
  try {
    await loadPortraitAtlases();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[portraits] preload skipped', e);
    }
  }
}
