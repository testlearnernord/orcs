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

function normalizeBaseUrl(value: string | undefined) {
  const raw = value ?? '/';
  const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw);
  if (isAbsolute) return raw.endsWith('/') ? raw : `${raw}/`;
  let prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  if (!prefixed.endsWith('/')) prefixed += '/';
  return prefixed;
}

const PORTRAIT_BASE = (() => {
  const base = normalizeBaseUrl(import.meta.env.BASE_URL);
  return `${base}assets/orcs/portraits/`;
})();

const PORTRAIT_SUFFIX = PORTRAIT_VERSION
  ? `?v=${encodeURIComponent(PORTRAIT_VERSION)}`
  : '';

const PORTRAIT_ATLASES = ['set_a.webp', 'set_b.webp'] as const;

export const ArtConfig = {
  active: getInitialArt(),
  base: PORTRAIT_BASE,
  atlases: PORTRAIT_ATLASES,
  version: PORTRAIT_VERSION
} satisfies {
  active: ArtSet;
  base: string;
  atlases: typeof PORTRAIT_ATLASES;
  version: string;
};

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
  ArtConfig.active = mode;
}
