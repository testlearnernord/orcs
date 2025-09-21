const rawPortraitVersion = import.meta.env.VITE_PORTRAITS_VERSION;
let portraitVersion =
  typeof rawPortraitVersion === 'string' ? rawPortraitVersion.trim() : '';

if (!portraitVersion) {
  const buildStamp =
    typeof __BUILD_TIME__ !== 'undefined' ? String(__BUILD_TIME__).trim() : '';
  if (buildStamp) {
    portraitVersion = buildStamp;
  } else {
    portraitVersion = 'dev';
  }
}

const PORTRAIT_VERSION = portraitVersion;

function normalizeBaseUrl(value: string | undefined) {
  const raw = value ?? '/';
  const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw);
  if (isAbsolute) return raw.endsWith('/') ? raw : `${raw}/`;
  let prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  if (!prefixed.endsWith('/')) prefixed += '/';
  return prefixed;
}

const PORTRAIT_BASE = `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/orcs/portraits/`;

const PORTRAIT_SUFFIX = PORTRAIT_VERSION
  ? `?v=${encodeURIComponent(PORTRAIT_VERSION)}`
  : '';

const PORTRAIT_ATLASES = ['set_a.webp', 'set_b.webp'] as const;

interface PortraitArtConfig {
  base: string;
  atlases: typeof PORTRAIT_ATLASES;
  version: string;
}

export type AtlasFile = (typeof PORTRAIT_ATLASES)[number];

export const ArtConfig: PortraitArtConfig = {
  base: PORTRAIT_BASE,
  atlases: PORTRAIT_ATLASES,
  version: PORTRAIT_VERSION
};

export function getAtlasUrl(file: AtlasFile) {
  return ArtConfig.base + file + PORTRAIT_SUFFIX;
}
