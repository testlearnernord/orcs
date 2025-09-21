const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export function normalizeBaseUrl(value: string | undefined): string {
  const raw = value ?? '/';
  if (ABSOLUTE_URL_PATTERN.test(raw)) {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`;
}

export function resolvePortraitVersion(raw: unknown): string {
  const explicit = typeof raw === 'string' ? raw.trim() : '';
  if (explicit) return explicit;
  const buildStamp =
    typeof __BUILD_TIME__ !== 'undefined' ? String(__BUILD_TIME__).trim() : '';
  return buildStamp || 'dev';
}

export const PORTRAIT_ATLASES = ['set_a.webp', 'set_b.webp'] as const;

export type PortraitAtlases = typeof PORTRAIT_ATLASES;
export type AtlasFile = PortraitAtlases[number];

export interface PortraitArtConfig {
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

type PortraitAtlases = typeof PORTRAIT_ATLASES;

interface PortraitArtConfig {
  active: ArtSet;
  base: string;
  atlases: PortraitAtlases;
  version: string;
}

const PORTRAIT_BASE = `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/orcs/portraits/`;
const PORTRAIT_VERSION = resolvePortraitVersion(
  import.meta.env.VITE_PORTRAITS_VERSION
);
const PORTRAIT_SUFFIX = PORTRAIT_VERSION
  ? `?v=${encodeURIComponent(PORTRAIT_VERSION)}`
  : '';

export const ArtConfig: PortraitArtConfig = {
export type AtlasFile = PortraitAtlases[number];

export const ArtConfig: PortraitArtConfig = {
  active: getInitialArt(),
  base: PORTRAIT_BASE,
  atlases: PORTRAIT_ATLASES,
  version: PORTRAIT_VERSION
};

export function getAtlasUrl(file: AtlasFile): string {
  return `${ArtConfig.base}${file}${PORTRAIT_SUFFIX}`;
export function getAtlasUrl(file: AtlasFile) {
  return ArtConfig.base + file + PORTRAIT_SUFFIX;
}
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
  ArtConfig.active = mode;
}
