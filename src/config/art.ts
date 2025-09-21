const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

const DEFAULT_PORTRAITS_VERSION = '20250215';

export function normalizeBaseUrl(value: string | undefined): string {
  const raw = value ?? '/';
  if (ABSOLUTE_URL_PATTERN.test(raw)) {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`;
}

export function resolvePortraitVersion(
  raw: unknown,
  fallback: string = DEFAULT_PORTRAITS_VERSION
): string {
  const explicit = typeof raw === 'string' ? raw.trim() : '';
  if (explicit) return explicit;
  const buildStamp =
    typeof __BUILD_TIME__ !== 'undefined' ? String(__BUILD_TIME__).trim() : '';
  return buildStamp || fallback;
}

export const PORTRAIT_ATLASES = ['set_a.webp', 'set_b.webp'] as const;

export type PortraitAtlases = typeof PORTRAIT_ATLASES;
export type AtlasFile = PortraitAtlases[number];

export interface PortraitArtConfig {
  base: string;
  atlases: PortraitAtlases;
  version: string;
}

const PORTRAIT_BASE = `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/orcs/portraits/`;
const PORTRAIT_VERSION = resolvePortraitVersion(
  import.meta.env.VITE_PORTRAITS_VERSION
);

export const ArtConfig: PortraitArtConfig = {
  base: PORTRAIT_BASE,
  atlases: PORTRAIT_ATLASES,
  version: PORTRAIT_VERSION
};

const PORTRAIT_SUFFIX = ArtConfig.version
  ? `?v=${encodeURIComponent(ArtConfig.version)}`
  : '';

export function getAtlasUrl(file: AtlasFile): string {
  return `${ArtConfig.base}${file}${PORTRAIT_SUFFIX}`;
}
