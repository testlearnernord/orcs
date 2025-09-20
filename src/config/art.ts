export type ArtSet = 'realistic' | 'legacy';

function getInitialArt(): ArtSet {
  try {
    const v = localStorage.getItem('art.active');
    return v === 'legacy' ? 'legacy' : 'realistic';
  } catch {
    return 'realistic';
  }
}

const PORTRAIT_VERSION = (() => {
  const value = import.meta.env.VITE_PORTRAITS_VERSION;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '20250215';
})();

const PORTRAIT_SUFFIX = PORTRAIT_VERSION
  ? `?v=${encodeURIComponent(PORTRAIT_VERSION)}`
  : '';

export const ArtConfig = {
  active: getInitialArt(),
  base: new URL('assets/orcs/portraits/', import.meta.env.BASE_URL).toString(),
  atlases: ['set_a.webp', 'set_b.webp'] as const,
  version: PORTRAIT_VERSION
} as const;

export type AtlasFile = (typeof ArtConfig.atlases)[number];

export function getAtlasUrl(file: AtlasFile) {
  return ArtConfig.base + file + PORTRAIT_SUFFIX;
}

export function setArtMode(mode: ArtSet) {
  try {
    localStorage.setItem('art.active', mode);
  } catch {
    /* ignore */
  }
  (ArtConfig as any).active = mode;
}
